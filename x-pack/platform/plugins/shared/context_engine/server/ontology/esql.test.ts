/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromSourcesOf, quoteField, quoteSource, sourceMatchesDataset } from './esql';

describe('fromSourcesOf', () => {
  it('lists the index expressions of the FROM', () => {
    expect(fromSourcesOf('FROM orders, logs-* METADATA _id | LIMIT 10')).toEqual([
      'orders',
      'logs-*',
    ]);
    expect(fromSourcesOf('FROM "my-index" | LIMIT 1')).toEqual(['my-index']);
  });

  it('returns none for a query without FROM or that does not parse', () => {
    expect(fromSourcesOf('ROW a = 1')).toEqual([]);
    expect(fromSourcesOf('FROM | |')).toEqual([]);
  });
});

describe('quoting', () => {
  it('quotes sources and fields for ES|QL', () => {
    expect(quoteSource('logs-app-default')).toBe('"logs-app-default"');
    expect(quoteField('user.name')).toBe('`user.name`');
    expect(quoteField('odd`name')).toBe('`odd``name`');
  });
});

describe('sourceMatchesDataset', () => {
  it('matches names exactly and patterns by wildcard', () => {
    expect(sourceMatchesDataset('orders', 'orders')).toBe(true);
    expect(sourceMatchesDataset('orders', 'orders-2')).toBe(false);
    expect(sourceMatchesDataset('logs-*', 'logs-app-default')).toBe(true);
    expect(sourceMatchesDataset('logs-*-default', 'logs-app-prod')).toBe(false);
    expect(sourceMatchesDataset('logs.app*', 'logsXapp')).toBe(false);
  });
});
