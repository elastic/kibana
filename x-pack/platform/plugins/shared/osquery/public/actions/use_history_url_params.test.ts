/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import {
  parseHistoryUrlParams,
  serializeHistoryUrlParams,
  useHistoryUrlParams,
} from './use_history_url_params';
import type { HistoryUrlFilters } from './use_history_url_params';
import { getHistoryFilters } from './history_filter_storage';

describe('parseHistoryUrlParams', () => {
  it('returns defaults for empty search string', () => {
    const result = parseHistoryUrlParams('');

    expect(result).toEqual({
      q: '',
      sources: [],
      runBy: [],
      tags: [],
      start: 'now-24h',
      end: 'now',
      pageSize: undefined,
      sortDirection: 'desc',
    });
  });

  it('parses all parameters', () => {
    const result = parseHistoryUrlParams(
      '?q=test&sources=live,rule&runBy=user1,user2&tags=tag1,tag2&start=now-7d&end=now-1d&pageSize=50&sortDirection=asc'
    );

    expect(result).toEqual({
      q: 'test',
      sources: ['live', 'rule'],
      runBy: ['user1', 'user2'],
      tags: ['tag1', 'tag2'],
      start: 'now-7d',
      end: 'now-1d',
      pageSize: 50,
      sortDirection: 'asc',
    });
  });

  it('parses partial parameters with defaults for missing', () => {
    const result = parseHistoryUrlParams('?q=test');

    expect(result).toEqual({
      q: 'test',
      sources: [],
      runBy: [],
      tags: [],
      start: 'now-24h',
      end: 'now',
      pageSize: undefined,
      sortDirection: 'desc',
    });
  });

  it('filters invalid source values', () => {
    const result = parseHistoryUrlParams('?sources=live,invalid,rule,bad');

    expect(result.sources).toEqual(['live', 'rule']);
  });

  it('handles all valid source values', () => {
    const result = parseHistoryUrlParams('?sources=live,rule,scheduled');

    expect(result.sources).toEqual(['live', 'rule', 'scheduled']);
  });

  it('returns empty sources for completely invalid values', () => {
    const result = parseHistoryUrlParams('?sources=invalid,bad');

    expect(result.sources).toEqual([]);
  });

  it('handles invalid pageSize gracefully', () => {
    expect(parseHistoryUrlParams('?pageSize=abc').pageSize).toBeUndefined();
    expect(parseHistoryUrlParams('?pageSize=-1').pageSize).toBeUndefined();
    expect(parseHistoryUrlParams('?pageSize=0').pageSize).toBeUndefined();
  });

  it('parses valid pageSize', () => {
    expect(parseHistoryUrlParams('?pageSize=25').pageSize).toBe(25);
    expect(parseHistoryUrlParams('?pageSize=100').pageSize).toBe(100);
  });

  it('handles URL-encoded search text', () => {
    const result = parseHistoryUrlParams('?q=SELECT+*+FROM+processes');

    expect(result.q).toBe('SELECT * FROM processes');
  });

  it('handles empty comma-separated values', () => {
    const result = parseHistoryUrlParams('?sources=&runBy=');

    expect(result.sources).toEqual([]);
    expect(result.runBy).toEqual([]);
  });

  it('parses valid sortDirection values', () => {
    expect(parseHistoryUrlParams('?sortDirection=asc').sortDirection).toBe('asc');
    expect(parseHistoryUrlParams('?sortDirection=desc').sortDirection).toBe('desc');
  });

  it('defaults sortDirection for invalid values', () => {
    expect(parseHistoryUrlParams('?sortDirection=invalid').sortDirection).toBe('desc');
    expect(parseHistoryUrlParams('?sortDirection=').sortDirection).toBe('desc');
  });
});

describe('serializeHistoryUrlParams', () => {
  it('omits parameters at default values', () => {
    const filters: HistoryUrlFilters = {
      q: '',
      sources: [],
      runBy: [],
      tags: [],
      start: 'now-24h',
      end: 'now',
      pageSize: undefined,
      sortDirection: 'desc',
    };

    const result = serializeHistoryUrlParams(filters);

    expect(result).toEqual({
      q: undefined,
      sources: undefined,
      runBy: undefined,
      tags: undefined,
      start: undefined,
      end: undefined,
      pageSize: undefined,
      sortDirection: undefined,
    });
  });

  it('serializes all non-default values', () => {
    const filters: HistoryUrlFilters = {
      q: 'test',
      sources: ['live', 'rule'],
      runBy: ['user1', 'user2'],
      tags: ['tag1', 'tag2'],
      start: 'now-7d',
      end: 'now-1d',
      pageSize: 50,
      sortDirection: 'asc',
    };

    const result = serializeHistoryUrlParams(filters);

    expect(result).toEqual({
      q: 'test',
      sources: 'live,rule',
      runBy: 'user1,user2',
      tags: 'tag1,tag2',
      start: 'now-7d',
      end: 'now-1d',
      pageSize: '50',
      sortDirection: 'asc',
    });
  });

  it('omits empty search text', () => {
    const filters: HistoryUrlFilters = {
      q: '',
      sources: ['live'],
      runBy: [],
      tags: [],
      start: 'now-24h',
      end: 'now',
      pageSize: undefined,
      sortDirection: 'desc',
    };

    const result = serializeHistoryUrlParams(filters);

    expect(result.q).toBeUndefined();
    expect(result.sources).toBe('live');
  });

  it('omits sortDirection at default value (desc)', () => {
    const filters: HistoryUrlFilters = {
      q: '',
      sources: [],
      runBy: [],
      tags: [],
      start: 'now-24h',
      end: 'now',
      pageSize: undefined,
      sortDirection: 'desc',
    };

    expect(serializeHistoryUrlParams(filters).sortDirection).toBeUndefined();
  });

  it('serializes non-default sortDirection', () => {
    const filters: HistoryUrlFilters = {
      q: '',
      sources: [],
      runBy: [],
      tags: [],
      start: 'now-24h',
      end: 'now',
      pageSize: undefined,
      sortDirection: 'asc',
    };

    expect(serializeHistoryUrlParams(filters).sortDirection).toBe('asc');
  });

  it('roundtrips through parse and serialize', () => {
    const search =
      '?q=test&sources=live,scheduled&runBy=user1&tags=important&start=now-7d&end=now-1d&pageSize=25&sortDirection=asc';
    const parsed = parseHistoryUrlParams(search);
    const serialized = serializeHistoryUrlParams(parsed);

    expect(serialized).toEqual({
      q: 'test',
      sources: 'live,scheduled',
      runBy: 'user1',
      tags: 'important',
      start: 'now-7d',
      end: 'now-1d',
      pageSize: '25',
      sortDirection: 'asc',
    });
  });
});

describe('useHistoryUrlParams', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  const renderWithRouter = (initialPath: string) => {
    const history = createMemoryHistory({ initialEntries: [initialPath] });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Router, { history }, children);

    return { ...renderHook(() => useHistoryUrlParams(), { wrapper }), history };
  };

  it('persists filters to sessionStorage when setFilter is called', () => {
    const { result } = renderWithRouter('/history');

    act(() => {
      result.current.setFilter('q', 'uptime');
    });

    expect(getHistoryFilters()).toContain('q=uptime');
  });

  it('persists filters to sessionStorage when setFilters is called', () => {
    const { result } = renderWithRouter('/history');

    act(() => {
      result.current.setFilters({ q: 'dns', sources: ['live'] });
    });

    const stored = getHistoryFilters();
    expect(stored).toContain('q=dns');
    expect(stored).toContain('sources=live');
  });

  it('URL wins over stale sessionStorage on mount', () => {
    sessionStorage.setItem('osquery:historyFilters', '?q=stale');
    const { result } = renderWithRouter('/history?q=fromUrl');

    expect(result.current.filters.q).toBe('fromUrl');
    expect(getHistoryFilters()).toContain('q=fromUrl');
  });

  it('stores empty string when all filters are at defaults', () => {
    const { result } = renderWithRouter('/history?q=test');

    act(() => {
      result.current.setFilter('q', '');
    });

    expect(getHistoryFilters()).toBe('');
  });
});
