/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDissectPattern, parseMultiDissectPatterns } from './dissect_patterns';

const names = (fields: Array<{ name: string }>) => fields.map((f) => f.name).sort();
const asObject = (fields: Array<{ name: string; type: string }>) =>
  Object.fromEntries(fields.map((f) => [f.name, f.type]));

describe('parseDissectPattern', () => {
  test('extracts basic fields without modifiers', () => {
    const pattern = '%{clientip} [%{@timestamp}] %{status}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['@timestamp', 'clientip', 'status']);
    expect(asObject(result)).toEqual({
      clientip: 'keyword',
      '@timestamp': 'keyword',
      status: 'keyword',
    });
  });

  test('supports dotted field names', () => {
    const pattern = '[%{log.severity}]';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['log.severity']);
  });

  test('skips named skip keys (?)', () => {
    const pattern = '%{clientip} %{?ident} %{?auth} [%{@timestamp}]';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['@timestamp', 'clientip']);
  });

  test('skips empty keys %{} and empty with right padding %{->}', () => {
    const pattern = '[%{ts}]%{->}[%{level}] %{ } %{}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['level', 'ts']);
  });

  test('handles right padding (->) on a key', () => {
    const pattern = '%{ts->} %{level}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['level', 'ts']);
  });

  test('handles append (+) without order and keeps unique field once', () => {
    const pattern = '%{+name} %{+name} %{+name} %{+name}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['name']);
  });

  test('handles append with order (+ /n) and keeps unique field once', () => {
    const pattern = '%{+name/2} %{+name/4} %{+name/3} %{+name/1}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['name']);
  });

  test('handles combined append order and right padding (+ /n ->)', () => {
    const pattern = '%{+full_name/1->} x %{+full_name/2}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['full_name']);
  });

  test('skips reference keys (* and &), which produce dynamic keys', () => {
    const pattern = '[%{ts}] [%{level}] %{*p1}:%{&p1} %{*p2}:%{&p2}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['level', 'ts']);
  });

  test('deduplicates repeated plain fields', () => {
    const pattern = '%{name} %{name} %{name}';
    const result = parseDissectPattern(pattern);
    expect(names(result)).toEqual(['name']);
  });

  test('returns empty for strings with no fields', () => {
    const pattern = 'no patterns here';
    const result = parseDissectPattern(pattern);
    expect(result).toEqual([]);
  });

  test('returns empty for only named skip key', () => {
    const pattern = '%{?ignored}';
    const result = parseDissectPattern(pattern);
    expect(result).toEqual([]);
  });
});

describe('parseMultiDissectPatterns', () => {
  test('aggregates unique allFields and groups by pattern', () => {
    const patterns = [
      '%{clientip} [%{@timestamp}] %{status}',
      '[%{log.severity}]',
      '%{+name/2} %{+name/1}',
      '%{ts->} %{level}',
    ];

    const result = parseMultiDissectPatterns(patterns);

    // fieldsByPattern individual expectations
    expect(result.fieldsByPattern[0].map((f) => f.name).sort()).toEqual([
      '@timestamp',
      'clientip',
      'status',
    ]);
    expect(result.fieldsByPattern[1].map((f) => f.name)).toEqual(['log.severity']);
    expect(result.fieldsByPattern[2].map((f) => f.name)).toEqual(['name']);
    expect(result.fieldsByPattern[3].map((f) => f.name).sort()).toEqual(['level', 'ts']);

    // allFields should contain the union of unique fields
    expect(names(result.allFields)).toEqual([
      '@timestamp',
      'clientip',
      'level',
      'log.severity',
      'name',
      'status',
      'ts',
    ]);

    // ensure all fields are keyword type for DISSECT
    result.allFields.forEach((f) => expect(f.type).toBe('keyword'));
  });

  test('handles empty patterns array', () => {
    const result = parseMultiDissectPatterns([]);
    expect(result.allFields).toEqual([]);
    expect(result.fieldsByPattern).toEqual([]);
  });
});
