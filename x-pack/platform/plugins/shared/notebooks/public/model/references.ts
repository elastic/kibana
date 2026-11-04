/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { CellDefinition, CellOutputKey, InputCellDefinition } from '../../common/types';

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
  /** Bound as `?name` in queries; an ES|QL table is a source, not a param. */
  isParam: boolean;
  /** The global time picker's `_tstart` and `_tend` cannot be renamed. */
  isFixed: boolean;
}

const getDefaultOutputs = (cell: CellDefinition): CellOutput[] => {
  const { name } = cell;
  const param = (key: CellOutputKey, defaultName: string): CellOutput => ({
    key,
    name: defaultName,
    isParam: true,
    isFixed: false,
  });
  if (cell.type === 'esql') return [{ key: 'table', name, isParam: false, isFixed: false }];
  if (cell.type !== 'input') return [];
  const { input } = cell;
  switch (input.kind) {
    case 'time':
      return input.pinned
        ? [
            { key: 'start', name: '_tstart', isParam: true, isFixed: true },
            { key: 'end', name: '_tend', isParam: true, isFixed: true },
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

/**
 * The cell with one output renamed, or the reason it can't be. Renaming back to the default
 * drops the override.
 */
export const renameOutput = (
  cells: Readonly<Record<string, CellDefinition>>,
  cell: CellDefinition,
  key: CellOutputKey,
  name: string
): { cell: CellDefinition } | { error: string } => {
  const current = getCellOutputs(cell).find((output) => output.key === key);
  if (!current || current.isFixed) return { error: 'This output cannot be renamed' };
  if (name === current.name) return { cell };
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
  return { cell: Object.keys(outputNames).length > 0 ? { ...rest, outputNames } : rest };
};

/** How a cell is named to people: its label, or its reference name when it has none. */
export const getCellDisplayName = ({ label, name }: CellDefinition): string => label || name;

/** Param names a cell consumes. */
export const getCellParamNames = (cell: CellDefinition): string[] => {
  if (cell.type === 'esql') return getQueryParamNames(cell.query);
  if (cell.type === 'input' && cell.input.kind === 'dropdown') {
    const { optionsSource = 'query', optionsQuery } = cell.input;
    return optionsSource === 'query' ? getQueryParamNames(optionsQuery) : [];
  }
  return [];
};
