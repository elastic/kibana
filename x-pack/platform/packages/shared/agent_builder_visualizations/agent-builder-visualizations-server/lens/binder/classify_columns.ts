/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ProbedColumn } from '../probe_columns';
import { kindFromEsqlType, type ColumnKind } from '../column_kind';
import { isRecord } from '../is_record';

export type ColumnRole = 'measure' | 'dimension';

export interface ClassifiedColumn {
  name: string;
  type: string;
  kind: ColumnKind;
  role: ColumnRole;
  sourceFields: string[];
}

export interface ClassifiedColumns {
  columns: ClassifiedColumn[];
  measures: ClassifiedColumn[];
  dimensions: ClassifiedColumn[];
}

interface NamedNode {
  type?: string;
  name?: string;
  text?: string;
  args?: unknown;
}

const asNodes = (value: unknown): NamedNode[] => {
  if (Array.isArray(value)) {
    return value.flatMap(asNodes);
  }
  if (isRecord(value)) {
    return [value as NamedNode];
  }
  return [];
};

const columnName = (node: NamedNode | undefined): string | undefined => {
  if (!node) {
    return undefined;
  }
  if (node.type === 'column' && typeof node.name === 'string' && node.name.length > 0) {
    return node.name;
  }
  if (node.type === 'identifier' && typeof node.name === 'string' && node.name.length > 0) {
    return node.name;
  }
  return undefined;
};

const collectColumnNames = (node: unknown, names: Set<string>): void => {
  for (const child of asNodes(node)) {
    const name = columnName(child);
    if (name && name !== '*') {
      names.add(name);
    }
    if (child.args !== undefined) {
      collectColumnNames(child.args, names);
    }
  }
};

const assignmentTarget = (node: NamedNode): string | undefined => {
  if (node.type === 'function' && node.name === '=') {
    return columnName(asNodes(node.args)[0]);
  }
  return undefined;
};

const functionSourceFields = (node: NamedNode): string[] => {
  const names = new Set<string>();
  const rhs = node.type === 'function' && node.name === '=' ? asNodes(node.args)[1] : node;
  collectColumnNames(rhs, names);
  return [...names];
};

const extractStatsRoles = (
  stats: NamedNode
): { measures: Map<string, string[]>; dimensions: Map<string, string[]> } => {
  const measures = new Map<string, string[]>();
  const dimensions = new Map<string, string[]>();

  for (const arg of asNodes(stats.args)) {
    if (arg.type === 'option' && arg.name === 'by') {
      for (const byArg of asNodes(arg.args)) {
        const aliased = assignmentTarget(byArg);
        if (aliased) {
          dimensions.set(aliased, functionSourceFields(byArg));
          continue;
        }
        const name = columnName(byArg);
        if (name) {
          dimensions.set(name, [name]);
        }
      }
      continue;
    }
    const aliased = assignmentTarget(arg);
    if (aliased) {
      measures.set(aliased, functionSourceFields(arg));
      continue;
    }
    if (arg.type === 'function' && typeof arg.text === 'string') {
      measures.set(arg.text, functionSourceFields(arg));
    }
  }

  return { measures, dimensions };
};

const applyRename = (names: Map<string, string[]>, from: string, to: string): void => {
  const sources = names.get(from);
  if (sources) {
    names.delete(from);
    names.set(to, sources);
  }
};

const applyCommandFollowThrough = (
  command: NamedNode,
  measures: Map<string, string[]>,
  dimensions: Map<string, string[]>
): void => {
  if (command.name === 'rename') {
    for (const arg of asNodes(command.args)) {
      if (arg.type === 'function' && arg.name === 'as') {
        const [left, right] = asNodes(arg.args);
        const from = columnName(left);
        const to = columnName(right);
        if (from && to) {
          applyRename(measures, from, to);
          applyRename(dimensions, from, to);
        }
      }
    }
    return;
  }
  if (command.name === 'eval') {
    for (const arg of asNodes(command.args)) {
      const target = assignmentTarget(arg);
      if (!target) {
        continue;
      }
      const sources = functionSourceFields(arg);
      if (sources.some((source) => measures.has(source))) {
        measures.set(target, sources);
      } else if (sources.some((source) => dimensions.has(source))) {
        dimensions.set(target, sources);
      }
    }
  }
};

const parseQueryRoles = (
  query: string
):
  | {
      measures: Map<string, string[]>;
      dimensions: Map<string, string[]>;
      statsMeasures: Set<string>;
    }
  | undefined => {
  const { root } = Parser.parse(query);
  const commands = asNodes(root.commands);
  let lastStatsIndex = -1;
  for (let i = 0; i < commands.length; i++) {
    if (commands[i].name === 'stats') {
      lastStatsIndex = i;
    }
  }
  if (lastStatsIndex < 0) {
    return undefined;
  }

  const { measures, dimensions } = extractStatsRoles(commands[lastStatsIndex]);
  const statsMeasures = new Set(measures.keys());
  for (let i = lastStatsIndex + 1; i < commands.length; i++) {
    applyCommandFollowThrough(commands[i], measures, dimensions);
  }
  return { measures, dimensions, statsMeasures };
};

export const classifyColumns = (query: string, probed: ProbedColumn[]): ClassifiedColumns => {
  const roles = parseQueryRoles(query);
  const columns = probed.map((column) => {
    const kind = kindFromEsqlType(column.type);
    if (roles) {
      const measureSources = roles.measures.get(column.name);
      if (measureSources) {
        const role: ColumnRole =
          kind !== 'numeric' && !roles.statsMeasures.has(column.name) ? 'dimension' : 'measure';
        return { ...column, kind, role, sourceFields: measureSources };
      }
      const dimensionSources = roles.dimensions.get(column.name);
      if (dimensionSources) {
        return { ...column, kind, role: 'dimension' as const, sourceFields: dimensionSources };
      }
    }
    const fallbackRole: ColumnRole = !roles && kind === 'numeric' ? 'measure' : 'dimension';
    return { ...column, kind, role: fallbackRole, sourceFields: [column.name] };
  });

  return {
    columns,
    measures: columns.filter((column) => column.role === 'measure'),
    dimensions: columns.filter((column) => column.role === 'dimension'),
  };
};

export const resolveColumnHint = (
  hint: string | undefined,
  classified: ClassifiedColumns
): ClassifiedColumn | undefined => {
  if (!hint) {
    return undefined;
  }
  const exact = classified.columns.find((column) => column.name === hint);
  if (exact) {
    return exact;
  }
  const bySource = classified.columns.filter((column) => column.sourceFields.includes(hint));
  return bySource.length === 1 ? bySource[0] : undefined;
};

export const hintCandidates = (hint: string, classified: ClassifiedColumns): string[] =>
  classified.columns
    .filter((column) => column.name === hint || column.sourceFields.includes(hint))
    .map((column) => column.name);
