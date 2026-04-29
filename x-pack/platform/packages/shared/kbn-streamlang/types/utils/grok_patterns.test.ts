/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseGrokPattern, parseMultiGrokPatterns } from './grok_patterns';

const names = (fields: Array<{ name: string }>) => fields.map((f) => f.name).sort();
const asObject = (fields: Array<{ name: string; type: string }>) =>
  Object.fromEntries(fields.map((f) => [f.name, f.type]));

describe('parseGrokPattern', () => {
  test('extracts fields and defaults to keyword when no conversion is provided', () => {
    const pattern = '%{IP:client} %{WORD:method} %{URIPATHPARAM:request}';
    const result = parseGrokPattern(pattern);
    expect(asObject(result)).toEqual({ client: 'keyword', method: 'keyword', request: 'keyword' });
  });

  test('extracts typed fields: int, long and float', () => {
    const pattern = '%{NUMBER:bytes:int} %{NUMBER:offset:long} %{NUMBER:duration:float}';
    const result = parseGrokPattern(pattern);
    expect(asObject(result)).toEqual({ bytes: 'int', offset: 'long', duration: 'float' });
  });

  test('ignores alias-only patterns (no semantic)', () => {
    const pattern = '%{COMBINEDAPACHELOG}';
    const result = parseGrokPattern(pattern);
    expect(result).toEqual([]);
  });

  test('supports dotted and @ field names', () => {
    const pattern = '%{TIMESTAMP_ISO8601:@timestamp} %{IP:source.ip}';
    const result = parseGrokPattern(pattern);
    expect(names(result)).toEqual(['@timestamp', 'source.ip']);
  });

  test('deduplicates repeated fields and keeps most specific type (float > long > int > keyword)', () => {
    const pattern = '%{NUMBER:num} %{NUMBER:num:int} %{NUMBER:num:long} %{NUMBER:num:float}';
    const result = parseGrokPattern(pattern);
    expect(asObject(result)).toEqual({ num: 'float' });
  });

  test('handles patterns with escaped brackets and other regex around tokens', () => {
    const pattern = '%{IP:ip} \\[%{TIMESTAMP_ISO8601:@timestamp}\\] %{GREEDYDATA:status}';
    const result = parseGrokPattern(pattern);
    expect(names(result)).toEqual(['@timestamp', 'ip', 'status']);
  });

  test('returns empty for strings with no grok tokens', () => {
    const pattern = 'no tokens here';
    const result = parseGrokPattern(pattern);
    expect(result).toEqual([]);
  });
});

describe('parseMultiGrokPatterns', () => {
  test('aggregates unique allFields with type precedence (float > long > int > keyword) and groups by pattern', () => {
    const patterns = [
      '%{IP:client} %{WORD:method} %{URIPATHPARAM:request}',
      '%{NUMBER:bytes:int} %{NUMBER:duration:long}',
      '%{NUMBER:bytes:long} %{NUMBER:duration:float}',
      '%{NUMBER:bytes} %{NUMBER:duration:int}',
    ];

    const result = parseMultiGrokPatterns(patterns);

    expect(result.fieldsByPattern[0].map((f) => f.name).sort()).toEqual([
      'client',
      'method',
      'request',
    ]);
    expect(asObject(result.fieldsByPattern[1])).toEqual({ bytes: 'int', duration: 'long' });
    expect(asObject(result.fieldsByPattern[2])).toEqual({ bytes: 'long', duration: 'float' });
    expect(asObject(result.fieldsByPattern[3])).toEqual({ bytes: 'keyword', duration: 'int' });

    // allFields: bytes should be long vs int vs keyword (long loses to none higher except float not present for bytes);
    // duration should be float (highest) over long/int/keyword
    expect(asObject(result.allFields)).toEqual({
      client: 'keyword',
      method: 'keyword',
      request: 'keyword',
      bytes: 'long',
      duration: 'float',
    });
  });

  test('handles empty patterns array', () => {
    const result = parseMultiGrokPatterns([]);
    expect(result.allFields).toEqual([]);
    expect(result.fieldsByPattern).toEqual([]);
  });
});
