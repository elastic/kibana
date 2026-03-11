/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assembleFullQuery } from './assemble_full_query';

describe('assembleFullQuery', () => {
  it('returns an empty string when base is empty', () => {
    expect(assembleFullQuery('', 'WHERE count > 100')).toBe('');
  });

  it('returns an empty string when base is undefined', () => {
    expect(assembleFullQuery(undefined, 'WHERE count > 100')).toBe('');
  });

  it('returns only the base when condition is empty', () => {
    expect(assembleFullQuery('FROM logs-*', '')).toBe('FROM logs-*');
  });

  it('returns only the base when condition is undefined', () => {
    expect(assembleFullQuery('FROM logs-*', undefined)).toBe('FROM logs-*');
  });

  it('returns only the base when condition is whitespace', () => {
    expect(assembleFullQuery('FROM logs-*', '   ')).toBe('FROM logs-*');
  });

  it('pipes condition that already has a WHERE prefix', () => {
    expect(assembleFullQuery('FROM logs-* | STATS count() BY host', 'WHERE count > 100')).toBe(
      'FROM logs-* | STATS count() BY host | WHERE count > 100'
    );
  });

  it('adds WHERE keyword when condition lacks the prefix', () => {
    expect(assembleFullQuery('FROM logs-* | STATS count() BY host', 'count > 100')).toBe(
      'FROM logs-* | STATS count() BY host | WHERE count > 100'
    );
  });

  it('handles lowercase where prefix', () => {
    expect(assembleFullQuery('FROM logs-*', 'where status >= 500')).toBe(
      'FROM logs-* | where status >= 500'
    );
  });

  it('handles mixed case WHERE prefix', () => {
    expect(assembleFullQuery('FROM logs-*', 'Where status >= 500')).toBe(
      'FROM logs-* | Where status >= 500'
    );
  });

  it('trims whitespace from base and condition', () => {
    expect(assembleFullQuery('  FROM logs-*  ', '  WHERE x > 1  ')).toBe(
      'FROM logs-* | WHERE x > 1'
    );
  });

  it('returns empty string when both base and condition are empty', () => {
    expect(assembleFullQuery('', '')).toBe('');
  });

  it('returns empty string when both base and condition are undefined', () => {
    expect(assembleFullQuery(undefined, undefined)).toBe('');
  });

  it('does not treat WHERE inside the condition expression as a prefix', () => {
    // A condition like "field LIKE '%WHERE%'" should get WHERE prepended
    expect(assembleFullQuery('FROM logs-*', "field LIKE '%WHERE%'")).toBe(
      "FROM logs-* | WHERE field LIKE '%WHERE%'"
    );
  });
});
