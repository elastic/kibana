/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition } from '../../common/types';
import { CELL_NAME_PATTERN, getCellParamNames, getExposedParamNames } from './references';

/** Dependencies between executable cells, derived from definitions on every change. */
export interface NotebookGraph {
  parents: ReadonlyMap<string, readonly string[]>;
  children: ReadonlyMap<string, readonly string[]>;
  /** Executable cells, parents before children, ties broken by notebook order. */
  order: readonly string[];
  /** Validation errors keyed by cell id. */
  errors: ReadonlyMap<string, string>;
}

const getNameError = (name: string, isDuplicate: boolean): string | undefined => {
  if (name.startsWith('_')) return `Names starting with "_" are reserved`;
  if (!CELL_NAME_PATTERN.test(name)) {
    return `"${name}" is not a valid name: use lowercase letters, digits and "_", starting with a letter`;
  }
  if (isDuplicate) return `Another cell is already named "${name}"`;
};

const groupBy = <T>(items: readonly T[], getKey: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return groups;
};

/** Tarjan's algorithm: cells that lie on a cycle, grouped by strongly connected component. */
const findCycles = (
  ids: readonly string[],
  parents: ReadonlyMap<string, readonly string[]>
): string[][] => {
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];

  const visit = (id: string): void => {
    index.set(id, index.size);
    lowLink.set(id, index.get(id) ?? 0);
    stack.push(id);
    onStack.add(id);
    (parents.get(id) ?? []).forEach((parent) => {
      if (!index.has(parent)) {
        visit(parent);
        lowLink.set(id, Math.min(lowLink.get(id) ?? 0, lowLink.get(parent) ?? 0));
      } else if (onStack.has(parent)) {
        lowLink.set(id, Math.min(lowLink.get(id) ?? 0, index.get(parent) ?? 0));
      }
    });
    if (lowLink.get(id) !== index.get(id)) return;
    const component: string[] = [];
    let member: string | undefined;
    do {
      member = stack.pop();
      if (member === undefined) break;
      onStack.delete(member);
      component.push(member);
    } while (member !== id);
    if (component.length > 1 || (parents.get(id) ?? []).includes(id)) cycles.push(component);
  };

  ids.forEach((id) => {
    if (!index.has(id)) visit(id);
  });
  return cycles;
};

/** Derives edges, topological order and validation errors from a notebook's definitions. */
export const buildGraph = (
  cells: Readonly<Record<string, CellDefinition>>,
  cellOrder: readonly string[]
): NotebookGraph => {
  const rank = new Map(cellOrder.map((id, position) => [id, position]));
  const allCells = Object.values(cells).sort(
    (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity)
  );
  const executable = allCells.filter(({ type }) => type !== 'markdown');
  const executableIds = executable.map(({ id }) => id);
  const nameOf = (id: string): string => cells[id]?.name ?? id;

  const errors = new Map<string, string>();
  const addError = (id: string, message: string): void => {
    if (!errors.has(id)) errors.set(id, message);
  };

  const cellsByName = groupBy(allCells, ({ name }) => name);
  allCells.forEach(({ id, name }) => {
    const error = getNameError(name, (cellsByName.get(name) ?? []).length > 1);
    if (error) addError(id, error);
  });

  const exposers = new Map<string, string[]>();
  executable.forEach((cell) => {
    if (cell.type !== 'input') return;
    getExposedParamNames(cell).forEach((param) => {
      exposers.set(param, [...(exposers.get(param) ?? []), cell.id]);
    });
  });
  exposers.forEach((ids, param) => {
    if (ids.length < 2) return;
    ids.forEach((id) => {
      const others = ids.filter((other) => other !== id).map((other) => `"${nameOf(other)}"`);
      addError(id, `Parameter ?${param} is also provided by ${others.join(', ')}`);
    });
  });

  const parents = new Map<string, string[]>();
  executable.forEach((cell) => {
    if (cell.type === 'chart') {
      const { sourceCell } = cell;
      const source = sourceCell === null ? undefined : cells[sourceCell];
      if (sourceCell !== null && !source) addError(cell.id, 'The source cell no longer exists');
      if (source && source.type !== 'esql') {
        addError(cell.id, `Source "${source.name}" is not an ES|QL cell`);
      }
      parents.set(cell.id, source?.type === 'esql' ? [source.id] : []);
      return;
    }
    const params = getCellParamNames(cell);
    const unknown = params.filter((param) => !exposers.has(param));
    if (unknown.length > 0) {
      const list = unknown.map((param) => `?${param}`).join(', ');
      addError(cell.id, `Unknown parameter${unknown.length > 1 ? 's' : ''} ${list}`);
    }
    parents.set(cell.id, [...new Set(params.flatMap((param) => exposers.get(param) ?? []))]);
  });

  const children = new Map<string, string[]>(executableIds.map((id) => [id, []]));
  parents.forEach((parentIds, id) => {
    parentIds.forEach((parent) => children.get(parent)?.push(id));
  });

  const inCycle = new Set<string>();
  findCycles(executableIds, parents).forEach((component) => {
    const members = executableIds.filter((id) => component.includes(id));
    const message =
      members.length === 1
        ? `Circular reference: "${nameOf(members[0])}" depends on itself`
        : `Circular reference between ${members.map((id) => `"${nameOf(id)}"`).join(', ')}`;
    members.forEach((id) => {
      inCycle.add(id);
      errors.set(id, message);
    });
  });

  const order: string[] = [];
  const placed = new Set<string>();
  while (order.length < executableIds.length) {
    const pending = executableIds.filter((id) => !placed.has(id));
    const next =
      pending.find((id) => (parents.get(id) ?? []).every((parent) => placed.has(parent))) ??
      pending.find((id) => inCycle.has(id)) ??
      pending[0];
    order.push(next);
    placed.add(next);
  }

  return { parents, children, order, errors };
};

/** Every cell downstream of `roots`, excluding the roots unless one descends from another. */
export const getDescendants = (graph: NotebookGraph, roots: Iterable<string>): Set<string> => {
  const descendants = new Set<string>();
  const queue = [...roots].flatMap((root) => graph.children.get(root) ?? []);
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || descendants.has(id)) continue;
    descendants.add(id);
    queue.push(...(graph.children.get(id) ?? []));
  }
  return descendants;
};
