/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataSourceFromQuery } from './get_data_source_from_query';

describe('getDataSourceFromQuery', () => {
  it('extracts a single index pattern from a FROM query', () => {
    expect(getDataSourceFromQuery('FROM logs-* | LIMIT 10')).toBe('logs-*');
  });

  it('extracts multiple index patterns as a comma-separated string', () => {
    expect(getDataSourceFromQuery('FROM logs-*, metrics-* | STATS count()')).toBe(
      'logs-*,metrics-*'
    );
  });

  it('returns undefined for an empty string', () => {
    expect(getDataSourceFromQuery('')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(getDataSourceFromQuery(undefined)).toBeUndefined();
  });

  it('returns undefined for a query without a FROM clause', () => {
    expect(getDataSourceFromQuery('SHOW INFO')).toBeUndefined();
  });

  it('handles a TS command query', () => {
    expect(getDataSourceFromQuery('TS metrics-* | LIMIT 5')).toBe('metrics-*');
  });
});
