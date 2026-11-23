/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlSourceTargets, isCircularSource } from './ai_index_source';

describe('getEsqlSourceTargets', () => {
  it('lists what FROM and TS read, in query order', () => {
    expect(getEsqlSourceTargets('FROM logs-*, metrics-a | LIMIT 1')).toEqual([
      { command: 'from', index: 'logs-*' },
      { command: 'from', index: 'metrics-a' },
    ]);
    expect(getEsqlSourceTargets('TS metrics-* | LIMIT 1')).toEqual([
      { command: 'ts', index: 'metrics-*' },
    ]);
  });

  it('splits a quoted comma list into one target per expression', () => {
    expect(getEsqlSourceTargets('FROM "logs-a, logs-b" | LIMIT 1')).toEqual([
      { command: 'from', index: 'logs-a' },
      { command: 'from', index: 'logs-b' },
    ]);
  });

  it('keeps the cluster of a cross-cluster source apart from its index', () => {
    expect(getEsqlSourceTargets('FROM remote:logs-*, orders')).toEqual([
      { command: 'from', prefix: 'remote', index: 'logs-*' },
      { command: 'from', index: 'orders' },
    ]);
  });

  it('includes joined indices and nested queries, and leaves out ENRICH policies', () => {
    expect(
      getEsqlSourceTargets(
        'FROM orders, (FROM archive | LIMIT 1) | LOOKUP JOIN customers ON id | ENRICH region-policy ON region'
      )
    ).toEqual([
      { command: 'from', index: 'orders' },
      { command: 'from', index: 'archive' },
      { command: 'join', index: 'customers' },
    ]);
  });

  it('finds nothing in a query that reads no index', () => {
    expect(getEsqlSourceTargets('ROW a = 1')).toEqual([]);
  });
});

describe('isCircularSource', () => {
  it('matches a local source that reads the dest, by name or glob', () => {
    expect(isCircularSource('FROM ai-index-shop | LIMIT 1', 'ai-index-shop')).toBe(true);
    expect(isCircularSource('FROM ai-index-* | LIMIT 1', 'ai-index-shop')).toBe(true);
    expect(isCircularSource('FROM orders, "logs, ai-index-shop"', 'ai-index-shop')).toBe(true);
    expect(isCircularSource('FROM orders | LOOKUP JOIN ai-index-shop ON id', 'ai-index-shop')).toBe(
      true
    );
  });

  it('does not match other indices, a remote cluster of the same name, or a policy', () => {
    expect(isCircularSource('FROM orders | LIMIT 1', 'ai-index-shop')).toBe(false);
    expect(isCircularSource('FROM remote:ai-index-shop', 'ai-index-shop')).toBe(false);
    expect(isCircularSource('FROM orders | ENRICH ai-index-shop ON id', 'ai-index-shop')).toBe(
      false
    );
  });
});
