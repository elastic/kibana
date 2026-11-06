/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInitialSearchProfilerIndex,
  getInitialSearchProfilerQuery,
  isSearchProfilerQueryPersistable,
  readSearchProfilerState,
  SEARCH_PROFILER_STATE_STORAGE_KEY,
  updateSearchProfilerQueryState,
  updateSearchProfilerState,
  writeSearchProfilerState,
} from './search_profiler_state_storage';

const DEFAULT_INDEX = '_all';
const DEFAULT_QUERY = '{ "query": { "match_all": {} } }';
const STORED_QUERY = '{ "query": { "term": { "message": "stored" } } }';
const URL_QUERY = '{ "query": { "term": { "message": "url" } } }';

describe('search profiler state storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty state when nothing is stored', () => {
    expect(readSearchProfilerState()).toEqual({});
  });

  it('stores and reads the current query and index', () => {
    writeSearchProfilerState({
      index: 'logs-*',
      query: '{ "query": { "match_all": {} } }',
    });

    expect(readSearchProfilerState()).toEqual({
      index: 'logs-*',
      query: '{ "query": { "match_all": {} } }',
    });
  });

  it('merges partial updates into the stored state', () => {
    writeSearchProfilerState({
      index: 'logs-*',
      query: '{ "query": { "match_all": {} } }',
    });

    updateSearchProfilerState({
      index: 'metrics-*',
    });

    expect(readSearchProfilerState()).toEqual({
      index: 'metrics-*',
      query: '{ "query": { "match_all": {} } }',
    });
  });

  it('ignores malformed stored state', () => {
    window.localStorage.setItem(SEARCH_PROFILER_STATE_STORAGE_KEY, '{not valid json');

    expect(readSearchProfilerState()).toEqual({});
  });

  it('ignores stored state with unexpected value types', () => {
    window.localStorage.setItem(
      SEARCH_PROFILER_STATE_STORAGE_KEY,
      JSON.stringify({ index: ['logs-*'], query: 123 })
    );

    expect(readSearchProfilerState()).toEqual({});
  });

  it('falls back to the default index when URL or stored index values are empty', () => {
    expect(
      getInitialSearchProfilerIndex({
        defaultIndex: DEFAULT_INDEX,
        indexFromUrl: '',
        storedIndex: 'logs-*',
      })
    ).toBe(DEFAULT_INDEX);

    expect(
      getInitialSearchProfilerIndex({
        defaultIndex: DEFAULT_INDEX,
        indexFromUrl: null,
        storedIndex: '',
      })
    ).toBe(DEFAULT_INDEX);
  });

  it('uses stored index content only when no URL index parameter is present', () => {
    expect(
      getInitialSearchProfilerIndex({
        defaultIndex: DEFAULT_INDEX,
        indexFromUrl: null,
        storedIndex: 'logs-*',
      })
    ).toBe('logs-*');
  });

  it('uses valid URL query content before stored query content', () => {
    expect(
      getInitialSearchProfilerQuery({
        defaultQuery: DEFAULT_QUERY,
        queryFromUrl: URL_QUERY,
        storedQuery: STORED_QUERY,
      })
    ).toBe(URL_QUERY);
  });

  it('falls back to the default query when URL query content is empty or invalid', () => {
    expect(
      getInitialSearchProfilerQuery({
        defaultQuery: DEFAULT_QUERY,
        queryFromUrl: '',
        storedQuery: STORED_QUERY,
      })
    ).toBe(DEFAULT_QUERY);

    expect(
      getInitialSearchProfilerQuery({
        defaultQuery: DEFAULT_QUERY,
        queryFromUrl: '!!!invalid',
        storedQuery: STORED_QUERY,
      })
    ).toBe(DEFAULT_QUERY);
  });

  it('uses stored query content only when no URL query parameter is present', () => {
    expect(
      getInitialSearchProfilerQuery({
        defaultQuery: DEFAULT_QUERY,
        queryFromUrl: null,
        storedQuery: STORED_QUERY,
      })
    ).toBe(STORED_QUERY);

    expect(
      getInitialSearchProfilerQuery({
        defaultQuery: DEFAULT_QUERY,
        queryFromUrl: null,
        storedQuery: '',
      })
    ).toBe(DEFAULT_QUERY);
  });

  it('only persists empty or valid JSON query content', () => {
    expect(isSearchProfilerQueryPersistable('')).toBe(true);
    expect(isSearchProfilerQueryPersistable(STORED_QUERY)).toBe(true);
    expect(isSearchProfilerQueryPersistable('!!!invalid')).toBe(false);

    writeSearchProfilerState({
      index: 'logs-*',
      query: STORED_QUERY,
    });

    updateSearchProfilerQueryState('!!!invalid');

    expect(readSearchProfilerState()).toEqual({
      index: 'logs-*',
      query: STORED_QUERY,
    });

    updateSearchProfilerQueryState('');

    expect(readSearchProfilerState()).toEqual({
      index: 'logs-*',
      query: '',
    });
  });
});
