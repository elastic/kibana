/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_RESULT_WINDOW } from '../../../common/constants';
import type { Filter, FilterOperator, Sort } from '../../../common/types';
import { FILTER_OPERATORS, VALUELESS_OPERATORS } from '../../../common/types';

export interface IndexViewState {
  readonly filters: Filter[];
  readonly search: string;
  readonly sort?: Sort;
  readonly facets: string[];
  /** Columns to show, in order (`_col`); empty means all columns. */
  readonly columns: string[];
  /** Columns to hide (`_nocol`); ignored when `columns` is set. */
  readonly hiddenColumns: string[];
  /** Zero-based page index. */
  readonly page: number;
  readonly size: number;
}

const RESERVED = {
  search: '_search',
  sort: '_sort',
  sortDesc: '_sort_desc',
  facet: '_facet',
  column: '_col',
  hiddenColumn: '_nocol',
  page: '_page',
  size: '_size',
} as const;

const RESERVED_KEYS = new Set<string>(Object.values(RESERVED));
const OPERATOR_SEPARATOR = '__';

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseFilterKey(key: string): { field: string; operator: FilterOperator } {
  const separator = key.lastIndexOf(OPERATOR_SEPARATOR);
  if (separator > 0) {
    const suffix = key.slice(separator + OPERATOR_SEPARATOR.length);
    const operator = FILTER_OPERATORS.find((candidate) => candidate === suffix);
    if (operator) {
      return { field: key.slice(0, separator), operator };
    }
  }
  return { field: key, operator: 'exact' };
}

/** Parses Datasette-style query string parameters into index view state. */
export function parseIndexViewState(search: string): IndexViewState {
  const params = new URLSearchParams(search);
  const filters: Filter[] = [];

  params.forEach((value, key) => {
    if (RESERVED_KEYS.has(key)) {
      return;
    }
    const { field, operator } = parseFilterKey(key);
    filters.push({ field, operator, value: VALUELESS_OPERATORS.includes(operator) ? '' : value });
  });

  const sortAsc = params.get(RESERVED.sort);
  const sortDesc = params.get(RESERVED.sortDesc);
  let sort: Sort | undefined;
  if (sortDesc) {
    sort = { field: sortDesc, direction: 'desc' };
  } else if (sortAsc) {
    sort = { field: sortAsc, direction: 'asc' };
  }

  const size = Math.min(
    parsePositiveInt(params.get(RESERVED.size), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const maxPage = Math.max(Math.floor(MAX_RESULT_WINDOW / size), 1);
  const page = Math.min(parsePositiveInt(params.get(RESERVED.page), 1), maxPage) - 1;

  return {
    filters,
    search: params.get(RESERVED.search) ?? '',
    sort,
    facets: [...new Set(params.getAll(RESERVED.facet))],
    columns: [...new Set(params.getAll(RESERVED.column))],
    hiddenColumns: [...new Set(params.getAll(RESERVED.hiddenColumn))],
    page,
    size,
  };
}

/** Serializes index view state to a query string, omitting defaults. */
export function serializeIndexViewState(state: IndexViewState): string {
  const params = new URLSearchParams();

  for (const { field, operator, value } of state.filters) {
    const key = operator === 'exact' ? field : `${field}${OPERATOR_SEPARATOR}${operator}`;
    params.append(key, VALUELESS_OPERATORS.includes(operator) ? '1' : value);
  }
  if (state.search) {
    params.set(RESERVED.search, state.search);
  }
  if (state.sort) {
    params.set(
      state.sort.direction === 'desc' ? RESERVED.sortDesc : RESERVED.sort,
      state.sort.field
    );
  }
  for (const facet of state.facets) {
    params.append(RESERVED.facet, facet);
  }
  for (const column of state.columns) {
    params.append(RESERVED.column, column);
  }
  for (const column of state.columns.length > 0 ? [] : state.hiddenColumns) {
    params.append(RESERVED.hiddenColumn, column);
  }
  if (state.page > 0) {
    params.set(RESERVED.page, String(state.page + 1));
  }
  if (state.size !== DEFAULT_PAGE_SIZE) {
    params.set(RESERVED.size, String(state.size));
  }

  return params.toString();
}
