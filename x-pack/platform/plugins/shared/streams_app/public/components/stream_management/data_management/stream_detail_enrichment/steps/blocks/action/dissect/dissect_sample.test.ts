/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dissectPatternToRegex } from './dissect_sample';

describe('dissectPatternToRegex', () => {
  it('returns null for pattern with no tokens', () => {
    expect(dissectPatternToRegex('')).toBeNull();
    expect(dissectPatternToRegex('just plain text')).toBeNull();
  });

  it('provides correct group-to-field-name mapping', () => {
    const result = dissectPatternToRegex('%{clientip} %{method} %{status}');

    expect(result!.groupToFieldName.get('_f0')).toBe('clientip');
    expect(result!.groupToFieldName.get('_f1')).toBe('method');
    expect(result!.groupToFieldName.get('_f2')).toBe('status');
  });

  it('provides match indices via the d flag', () => {
    const result = dissectPatternToRegex('%{a} %{b}');
    const match = result!.regex.exec('hello world');

    expect(match!.indices!.groups!._f0).toEqual([0, 5]);
    expect(match!.indices!.groups!._f1).toEqual([6, 11]);
  });

  it('escapes regex special characters in delimiters', () => {
    const result = dissectPatternToRegex('[%{ts}] %{msg}');
    const match = result!.regex.exec('[2024-01-01] hello world');

    expect(match!.groups!._f0).toBe('2024-01-01');
    expect(match!.groups!._f1).toBe('hello world');
  });

  it('makes the last token greedy when no trailing literal', () => {
    const result = dissectPatternToRegex('%{a} %{b}');
    const match = result!.regex.exec('x y z w');

    expect(match!.groups!._f0).toBe('x');
    expect(match!.groups!._f1).toBe('y z w');
  });

  it('makes the last token non-greedy when there is trailing literal', () => {
    const result = dissectPatternToRegex('%{a} %{b};');
    const match = result!.regex.exec('x y;');

    expect(match!.groups!._f0).toBe('x');
    expect(match!.groups!._f1).toBe('y');
  });

  it('handles a real-world Apache log pattern', () => {
    const result = dissectPatternToRegex('%{ip} - - [%{ts}] "%{request}" %{status} %{size}');
    const sample = '55.3.244.1 - - [2024-01-01T00:00:00Z] "GET /index.html HTTP/1.1" 200 1234';
    const match = result!.regex.exec(sample);

    expect(match!.groups!._f0).toBe('55.3.244.1');
    expect(match!.groups!._f1).toBe('2024-01-01T00:00:00Z');
    expect(match!.groups!._f2).toBe('GET /index.html HTTP/1.1');
    expect(match!.groups!._f3).toBe('200');
    expect(match!.groups!._f4).toBe('1234');
  });

  it('uses index-based group names so duplicate field names do not collide', () => {
    const result = dissectPatternToRegex('%{+name/1} %{+name/2}');
    const match = result!.regex.exec('John Doe');

    expect(result!.groupToFieldName.get('_f0')).toBe('name');
    expect(result!.groupToFieldName.get('_f1')).toBe('name');
    expect(match!.groups!._f0).toBe('John');
    expect(match!.groups!._f1).toBe('Doe');
  });

  it('uses index-based group names so special characters in field names are safe', () => {
    const result = dissectPatternToRegex('%{@timestamp} %{host.name}');

    expect(result!.groupToFieldName.get('_f0')).toBe('@timestamp');
    expect(result!.groupToFieldName.get('_f1')).toBe('host.name');
  });
});
