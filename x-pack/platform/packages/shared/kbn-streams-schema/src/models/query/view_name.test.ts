/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ESQL_VIEW_PREFIX,
  getEsqlViewName,
  getStreamNameFromViewName,
  getWiredStreamViewQuery,
} from './view_name';

describe('getEsqlViewName', () => {
  it('prefixes the stream name with the view prefix', () => {
    expect(getEsqlViewName('logs.otel')).toBe('$.logs.otel');
  });

  it('works for deeply nested stream names', () => {
    expect(getEsqlViewName('logs.otel.nginx.access')).toBe('$.logs.otel.nginx.access');
  });
});

describe('getStreamNameFromViewName', () => {
  it('extracts the stream name from a valid view name', () => {
    expect(getStreamNameFromViewName('$.logs.otel')).toBe('logs.otel');
  });

  it('returns null for names without the view prefix', () => {
    expect(getStreamNameFromViewName('other.name')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(getStreamNameFromViewName('')).toBeNull();
  });

  it('returns empty string for just the prefix', () => {
    expect(getStreamNameFromViewName(ESQL_VIEW_PREFIX)).toBe('');
  });
});

describe('getWiredStreamViewQuery', () => {
  it('returns FROM with METADATA _source when there are no children', () => {
    expect(getWiredStreamViewQuery('logs.otel', [])).toBe('FROM logs.otel METADATA _source');
  });

  it('returns FROM with METADATA _source when children is omitted', () => {
    expect(getWiredStreamViewQuery('logs.otel')).toBe('FROM logs.otel METADATA _source');
  });

  it('includes a single child view reference with METADATA _source', () => {
    expect(getWiredStreamViewQuery('logs.otel', ['logs.otel.nginx'])).toBe(
      'FROM logs.otel, $.logs.otel.nginx METADATA _source'
    );
  });

  it('includes multiple child view references with METADATA _source', () => {
    expect(getWiredStreamViewQuery('logs.otel', ['logs.otel.nginx', 'logs.otel.apache'])).toBe(
      'FROM logs.otel, $.logs.otel.nginx, $.logs.otel.apache METADATA _source'
    );
  });

  it('preserves child ordering from the input array', () => {
    const result = getWiredStreamViewQuery('logs.otel', ['logs.otel.postgres', 'logs.otel.nginx']);
    expect(result).toBe('FROM logs.otel, $.logs.otel.postgres, $.logs.otel.nginx METADATA _source');
  });
});
