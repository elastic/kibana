/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseHistoryUrlParams, serializeHistoryUrlParams } from './use_history_url_params';
import type { HistoryUrlFilters } from './use_history_url_params';

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
    });
  });

  it('parses all parameters', () => {
    const result = parseHistoryUrlParams(
      '?q=test&sources=live,rule&runBy=user1,user2&tags=tag1,tag2&start=now-7d&end=now-1d&pageSize=50'
    );

    expect(result).toEqual({
      q: 'test',
      sources: ['live', 'rule'],
      runBy: ['user1', 'user2'],
      tags: ['tag1', 'tag2'],
      start: 'now-7d',
      end: 'now-1d',
      pageSize: 50,
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
    };

    const result = serializeHistoryUrlParams(filters);

    expect(result.q).toBeUndefined();
    expect(result.sources).toBe('live');
  });

  it('roundtrips through parse and serialize', () => {
    const search =
      '?q=test&sources=live,scheduled&runBy=user1&tags=important&start=now-7d&end=now-1d&pageSize=25';
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
    });
  });
});
