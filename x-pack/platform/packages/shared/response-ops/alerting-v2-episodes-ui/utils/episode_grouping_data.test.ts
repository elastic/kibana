/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatGroupingValueForDisplay,
  getNonEmptyGroupingFields,
  getValueByFieldPath,
  parseEpisodeDataJson,
} from './episode_grouping_data';

describe('getValueByFieldPath', () => {
  it('reads a nested dot path', () => {
    expect(getValueByFieldPath({ host: { name: 'foo' } }, 'host.name')).toBe('foo');
  });

  it('falls back to a top-level key when the path is not nested', () => {
    expect(getValueByFieldPath({ 'host.name': 'foobar' }, 'host.name')).toBe('foobar');
  });

  it('prefers the flat path when both nested and a flat dotted key exist', () => {
    expect(
      getValueByFieldPath({ host: { name: 'nested' }, 'host.name': 'flat' }, 'host.name')
    ).toBe('flat');
  });

  it('returns undefined when the path is missing', () => {
    expect(getValueByFieldPath({ other: 1 }, 'host.name')).toBeUndefined();
  });
});

describe('formatGroupingValueForDisplay', () => {
  it('returns empty string for null and undefined', () => {
    expect(formatGroupingValueForDisplay(null)).toBe('');
    expect(formatGroupingValueForDisplay(undefined)).toBe('');
  });

  it('stringifies primitives', () => {
    expect(formatGroupingValueForDisplay('x')).toBe('x');
    expect(formatGroupingValueForDisplay(42)).toBe('42');
    expect(formatGroupingValueForDisplay(true)).toBe('true');
  });

  it('JSON-stringifies plain objects', () => {
    expect(formatGroupingValueForDisplay({ a: 1 })).toBe('{"a":1}');
  });

  it('JSON-stringifies arrays', () => {
    expect(formatGroupingValueForDisplay([1, 2])).toBe('[1,2]');
  });
});

describe('getNonEmptyGroupingFields', () => {
  it('keeps fields whose formatted value is non-empty', () => {
    const data = { host: { name: 'h1' }, 'rule.id': '   x   ' };
    expect(getNonEmptyGroupingFields(['host.name', 'rule.id', 'missing'], data)).toEqual([
      'host.name',
      'rule.id',
    ]);
  });

  it('drops fields that resolve to empty, whitespace-only, or missing values', () => {
    const data = { host: { name: '' }, 'rule.id': '  \t  ', other: 'ok', foobar: '   ' };
    expect(
      getNonEmptyGroupingFields(['host.name', 'rule.id', 'missing', 'other', 'foobar'], data)
    ).toEqual(['other']);
  });
});

describe('parseEpisodeDataJson', () => {
  it('returns empty object for null, empty string, or non-string input', () => {
    expect(parseEpisodeDataJson(null)).toEqual({});
    expect(parseEpisodeDataJson(undefined)).toEqual({});
    expect(parseEpisodeDataJson('')).toEqual({});
    expect(parseEpisodeDataJson(123)).toEqual({});
  });

  it('parses a JSON object string', () => {
    expect(parseEpisodeDataJson('{"host":{"name":"n1"}}')).toEqual({ host: { name: 'n1' } });
  });

  it('returns empty object for invalid JSON', () => {
    expect(parseEpisodeDataJson('{not json')).toEqual({});
  });

  it('returns empty object for JSON arrays or non-object primitives', () => {
    expect(parseEpisodeDataJson('[1,2]')).toEqual({});
    expect(parseEpisodeDataJson('"only-a-string"')).toEqual({});
    expect(parseEpisodeDataJson('true')).toEqual({});
  });
});
