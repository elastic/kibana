/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import type {
  CellDefinition,
  CellOutputKey,
  CustomCellDefinition,
  InputCellDefinition,
} from '../../common/types';

/** Cell names must match this; a leading `_` is reserved for built-in params such as `_tstart`. */
export const CELL_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

const PARAM_FALLBACK_PATTERN = /\?{1,2}([A-Za-z_][A-Za-z0-9_]*)/g;

/** Unique names of the `?param` and `??param` references in an ES|QL query, without prefixes. */
export const getQueryParamNames = (query: string): string[] => {
  try {
    return [...new Set(getESQLQueryVariables(query))];
  } catch {
    return [...new Set([...query.matchAll(PARAM_FALLBACK_PATTERN)].map(([, name]) => name))];
  }
};

export interface CellOutput {
  key: CellOutputKey;
  name: string;
  /** The global time picker's `_tstart` and `_tend` cannot be renamed. */
  isFixed: boolean;
}

const getDefaultOutputs = (cell: CellDefinition): CellOutput[] => {
  const { name } = cell;
  const param = (key: CellOutputKey, defaultName: string): CellOutput => ({
    key,
    name: defaultName,
    isFixed: false,
  });
  if (cell.type === 'esql') return [{ key: 'table', name, isFixed: false }];
  if (cell.type !== 'input') return [];
  const { input } = cell;
  switch (input.kind) {
    case 'time':
      return input.pinned
        ? [
            { key: 'start', name: '_tstart', isFixed: true },
            { key: 'end', name: '_tend', isFixed: true },
          ]
        : [param('start', `${name}_start`), param('end', `${name}_end`)];
    case 'dropdown':
      return [param('value', name)];
    case 'range':
      return [param('min', `${name}_min`), param('max', `${name}_max`)];
  }
};

/** Everything a cell exposes to other cells, with any renames applied. */
export const getCellOutputs = (cell: CellDefinition): CellOutput[] =>
  getDefaultOutputs(cell).map((output) => ({
    ...output,
    name: output.isFixed ? output.name : cell.outputNames?.[output.key] ?? output.name,
  }));

/** Param names an input cell binds for its consumers. */
export const getExposedParamNames = (cell: InputCellDefinition): string[] =>
  getCellOutputs(cell).map(({ name }) => name);

/** Why an output name is unusable, or undefined when it is valid. */
export const getOutputNameError = (name: string): string | undefined => {
  if (name.startsWith('_')) return `Names starting with "_" are reserved`;
  if (!CELL_NAME_PATTERN.test(name)) {
    return `"${name}" is not a valid name: use lowercase letters, digits and "_", starting with a letter`;
  }
};

/** Every output name in use across the notebook, renamed or default. */
export const getAllOutputNames = (cells: Readonly<Record<string, CellDefinition>>): Set<string> =>
  new Set(Object.values(cells).flatMap((cell) => getCellOutputs(cell).map(({ name }) => name)));

const LEADING_PARAM_PREFIX = /^\?{1,2}/;

const findParams = (query: string): Array<{ text: string; min: number }> => {
  try {
    return Walker.params(Parser.parse(query).root).map(({ text, location }) => ({
      text,
      min: location.min,
    }));
  } catch {
    return [...query.matchAll(PARAM_FALLBACK_PATTERN)].map((match) => ({
      text: match[0],
      min: match.index ?? 0,
    }));
  }
};

/** The query with every `?from` and `??from` param reference renamed to `to`. */
export const renameQueryParam = (query: string, from: string, to: string): string => {
  const starts = new Set(
    findParams(query)
      .filter(({ text }) => text.replace(LEADING_PARAM_PREFIX, '') === from)
      .map(({ min }) => min)
  );
  return [...starts]
    .sort((a, b) => b - a)
    .reduce((renamed, min) => {
      const prefix = renamed.slice(min).match(LEADING_PARAM_PREFIX)?.[0];
      if (!prefix || !renamed.startsWith(from, min + prefix.length)) return renamed;
      return `${renamed.slice(0, min)}${prefix}${to}${renamed.slice(
        min + prefix.length + from.length
      )}`;
    }, query);
};

/** A custom cell's own query, or undefined when its rows come from a source cell. */
export const getOwnQuery = ({ dataSource, query = '' }: CustomCellDefinition): string | undefined =>
  dataSource === 'query' ? query : undefined;

const renameCellParam = (cell: CellDefinition, from: string, to: string): CellDefinition => {
  if (cell.type === 'esql' || (cell.type === 'custom' && cell.query !== undefined)) {
    const current = cell.query ?? '';
    const query = renameQueryParam(current, from, to);
    return query === current ? cell : { ...cell, query };
  }
  if (cell.type === 'input' && cell.input.kind === 'dropdown') {
    const optionsQuery = renameQueryParam(cell.input.optionsQuery, from, to);
    return optionsQuery === cell.input.optionsQuery
      ? cell
      : { ...cell, input: { ...cell.input, optionsQuery } };
  }
  return cell;
};

/**
 * The notebook with one output renamed and every query that referenced it updated, or the reason
 * it can't be renamed. Renaming back to the default drops the override.
 */
export const renameOutput = (
  cells: Readonly<Record<string, CellDefinition>>,
  cell: CellDefinition,
  key: CellOutputKey,
  name: string
): { cells: Record<string, CellDefinition> } | { error: string } => {
  const current = getCellOutputs(cell).find((output) => output.key === key);
  if (!current || current.isFixed) return { error: 'This output cannot be renamed' };
  if (name === current.name) return { cells: { ...cells } };
  const invalid = getOutputNameError(name);
  if (invalid) return { error: invalid };
  const others = { ...cells };
  delete others[cell.id];
  const siblings = getCellOutputs(cell).filter((output) => output.key !== key);
  if (getAllOutputNames(others).has(name) || siblings.some((output) => output.name === name)) {
    return { error: `"${name}" is already in use` };
  }

  const isDefault = getDefaultOutputs(cell).some(
    (output) => output.key === key && output.name === name
  );
  const { [key]: _previous, ...kept } = cell.outputNames ?? {};
  const outputNames = isDefault ? kept : { ...kept, [key]: name };
  const { outputNames: _old, ...rest } = cell;
  const renamed: CellDefinition =
    Object.keys(outputNames).length > 0 ? { ...rest, outputNames } : rest;

  const rewritten = Object.fromEntries(
    Object.entries({ ...cells, [cell.id]: renamed }).map(([id, other]) => [
      id,
      current.key === 'table' ? other : renameCellParam(other, current.name, name),
    ])
  );
  return { cells: rewritten };
};

/** How a cell is named to people: its label, or its reference name when it has none. */
export const getCellDisplayName = ({ label, name }: CellDefinition): string => label || name;

/** Param names a cell consumes. */
export const getCellParamNames = (cell: CellDefinition): string[] => {
  if (cell.type === 'esql') return getQueryParamNames(cell.query);
  if (cell.type === 'custom') {
    const query = getOwnQuery(cell);
    return query === undefined ? [] : getQueryParamNames(query);
  }
  if (cell.type === 'input' && cell.input.kind === 'dropdown') {
    const { optionsSource = 'query', optionsQuery } = cell.input;
    return optionsSource === 'query' ? getQueryParamNames(optionsQuery) : [];
  }
  return [];
};
