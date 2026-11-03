/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue, toCsv } from './csv';

describe('formatValue', () => {
  it('renders null and undefined as empty strings', () => {
    expect(formatValue(null)).toBe('');
    expect(formatValue(undefined)).toBe('');
  });

  it('renders arrays and objects as JSON', () => {
    expect(formatValue(['a', 1])).toBe('["a",1]');
    expect(formatValue({ a: true })).toBe('{"a":true}');
  });

  it('renders scalars as strings', () => {
    expect(formatValue(42)).toBe('42');
    expect(formatValue(false)).toBe('false');
  });
});

describe('toCsv', () => {
  it('writes a header and CRLF-terminated rows', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x\r\n');
  });

  it('quotes cells containing separators, quotes or newlines', () => {
    expect(toCsv(['v'], [['a,b'], ['say "hi"'], ['line\nbreak']])).toBe(
      'v\r\n"a,b"\r\n"say ""hi"""\r\n"line\nbreak"\r\n'
    );
  });

  it('neutralizes spreadsheet formulas in strings but not negative numbers', () => {
    expect(toCsv(['v'], [['=SUM(A1)'], [-5]])).toBe("v\r\n'=SUM(A1)\r\n-5\r\n");
  });

  it('writes empty cells for missing values', () => {
    expect(toCsv(['a', 'b'], [[undefined, null]])).toBe('a,b\r\n,\r\n');
  });
});
