/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { CellDefinition, InputCellDefinition } from '../../common/types';

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

/** Param names an input cell binds for its consumers. */
export const getExposedParamNames = ({ name, input }: InputCellDefinition): string[] => {
  switch (input.kind) {
    case 'time':
      return input.pinned ? ['_tstart', '_tend'] : [`${name}_start`, `${name}_end`];
    case 'dropdown':
      return [name];
    case 'range':
      return [`${name}_min`, `${name}_max`];
  }
};

/** Param names a cell consumes. */
export const getCellParamNames = (cell: CellDefinition): string[] => {
  if (cell.type === 'esql') return getQueryParamNames(cell.query);
  if (cell.type === 'input' && cell.input.kind === 'dropdown') {
    const { optionsSource = 'query', optionsQuery } = cell.input;
    return optionsSource === 'query' ? getQueryParamNames(optionsQuery) : [];
  }
  return [];
};
