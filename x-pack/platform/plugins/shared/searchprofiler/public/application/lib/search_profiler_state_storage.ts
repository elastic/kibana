/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkForParseErrors } from './check_for_json_errors';

export const SEARCH_PROFILER_STATE_STORAGE_KEY = 'xpack.searchProfiler.state';

export interface SearchProfilerStoredState {
  index?: string;
  query?: string;
}

export interface InitialSearchProfilerQueryParams {
  defaultQuery: string;
  queryFromUrl: string | null;
  storedQuery?: string;
}

export interface InitialSearchProfilerIndexParams {
  defaultIndex: string;
  indexFromUrl: string | null;
  storedIndex?: string;
}

const isSearchProfilerStoredState = (value: unknown): value is SearchProfilerStoredState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const { index, query } = value as Partial<Record<keyof SearchProfilerStoredState, unknown>>;

  return (
    (index === undefined || typeof index === 'string') &&
    (query === undefined || typeof query === 'string')
  );
};

export const readSearchProfilerState = (): SearchProfilerStoredState => {
  try {
    const storedValue = window.localStorage.getItem(SEARCH_PROFILER_STATE_STORAGE_KEY);

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!isSearchProfilerStoredState(parsedValue)) {
      return {};
    }

    return parsedValue;
  } catch {
    return {};
  }
};

export const writeSearchProfilerState = (state: SearchProfilerStoredState): void => {
  try {
    window.localStorage.setItem(SEARCH_PROFILER_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors so Search Profiler remains usable in restricted browser contexts.
  }
};

export const updateSearchProfilerState = (state: SearchProfilerStoredState): void => {
  writeSearchProfilerState({
    ...readSearchProfilerState(),
    ...state,
  });
};

export const isSearchProfilerQueryPersistable = (query: string): boolean => {
  return query === '' || checkForParseErrors(query).error === null;
};

export const updateSearchProfilerQueryState = (query: string): void => {
  if (!isSearchProfilerQueryPersistable(query)) {
    return;
  }

  updateSearchProfilerState({ query });
};

const getValidQuery = (query?: string | null): string | undefined => {
  if (!query || !isSearchProfilerQueryPersistable(query)) {
    return undefined;
  }

  return query;
};

export const getInitialSearchProfilerQuery = ({
  defaultQuery,
  queryFromUrl,
  storedQuery,
}: InitialSearchProfilerQueryParams): string => {
  return (
    getValidQuery(queryFromUrl) ??
    (queryFromUrl === null ? getValidQuery(storedQuery) : undefined) ??
    defaultQuery
  );
};

export const getInitialSearchProfilerIndex = ({
  defaultIndex,
  indexFromUrl,
  storedIndex,
}: InitialSearchProfilerIndexParams): string =>
  indexFromUrl || (indexFromUrl === null ? storedIndex : undefined) || defaultIndex;
