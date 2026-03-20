/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractCurrentToken,
  detectValueContext,
  getFieldSuggestions,
  getValueSuggestions,
  computeSuggestions,
  applyInsertText,
} from './matcher_suggestions';

describe('extractCurrentToken', () => {
  it('returns null when cursor is at position 0', () => {
    expect(extractCurrentToken('episode_id', 0)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractCurrentToken('', 5)).toBeNull();
  });

  it('extracts a token at the end of the string', () => {
    expect(extractCurrentToken('ep', 2)).toEqual({ token: 'ep', start: 0, end: 2 });
  });

  it('extracts a token in the middle of the string', () => {
    expect(extractCurrentToken('foo and ep', 10)).toEqual({ token: 'ep', start: 8, end: 10 });
  });

  it('extracts a token at the cursor when cursor is mid-token', () => {
    expect(extractCurrentToken('episode_id', 4)).toEqual({
      token: 'episode_id',
      start: 0,
      end: 10,
    });
  });

  it('returns null for KQL operators', () => {
    expect(extractCurrentToken('and', 3)).toBeNull();
    expect(extractCurrentToken('or', 2)).toBeNull();
    expect(extractCurrentToken('not', 3)).toBeNull();
  });

  it('is case-insensitive for KQL operators', () => {
    expect(extractCurrentToken('AND', 3)).toBeNull();
    expect(extractCurrentToken('Or', 2)).toBeNull();
  });

  it('stops at colon delimiter', () => {
    expect(extractCurrentToken('field: val', 10)).toEqual({ token: 'val', start: 7, end: 10 });
  });

  it('stops at parenthesis delimiter', () => {
    expect(extractCurrentToken('(field)', 6)).toEqual({ token: 'field', start: 1, end: 6 });
  });

  it('stops at quote delimiter', () => {
    expect(extractCurrentToken('"value"', 6)).toEqual({ token: 'value', start: 1, end: 6 });
  });

  it('returns null when cursor is on a delimiter', () => {
    expect(extractCurrentToken('field : ', 8)).toBeNull();
  });
});

describe('detectValueContext', () => {
  it('returns null when there is no colon pattern', () => {
    expect(detectValueContext('episode_id', 10)).toBeNull();
  });

  it('returns field path when cursor is after "field : "', () => {
    expect(detectValueContext('episode_status : ', 17)).toEqual({
      fieldPath: 'episode_status',
      insertPos: 17,
    });
  });

  it('returns field path for boolean field', () => {
    expect(detectValueContext('rule.enabled : ', 15)).toEqual({
      fieldPath: 'rule.enabled',
      insertPos: 15,
    });
  });

  it('returns null for fields without known values', () => {
    expect(detectValueContext('episode_id : ', 13)).toBeNull();
  });

  it('returns null for unknown fields', () => {
    expect(detectValueContext('unknown_field : ', 16)).toBeNull();
  });

  it('works without space around the colon', () => {
    expect(detectValueContext('episode_status:', 15)).toEqual({
      fieldPath: 'episode_status',
      insertPos: 15,
    });
  });
});

describe('getFieldSuggestions', () => {
  it('returns matching fields for a prefix', () => {
    const results = getFieldSuggestions('ep');
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.label)).toEqual(['episode_id', 'episode_status']);
  });

  it('returns all rule fields for "rule."', () => {
    const results = getFieldSuggestions('rule.');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.label.startsWith('rule.'))).toBe(true);
  });

  it('is case-insensitive', () => {
    const results = getFieldSuggestions('EP');
    expect(results.map((r) => r.label)).toEqual(['episode_id', 'episode_status']);
  });

  it('returns empty array when no fields match', () => {
    expect(getFieldSuggestions('zzz')).toHaveLength(0);
  });

  it('includes type and description in results', () => {
    const [first] = getFieldSuggestions('episode_id');
    expect(first.type).toBe('string');
    expect(first.description).toBe('Unique episode identifier');
    expect(first.insertText).toBe('episode_id');
  });
});

describe('getValueSuggestions', () => {
  it('returns quoted values for string fields', () => {
    const results = getValueSuggestions('episode_status', '');
    expect(results.map((r) => r.label)).toEqual([
      '"inactive"',
      '"pending"',
      '"active"',
      '"recovering"',
    ]);
  });

  it('returns unquoted values for boolean fields', () => {
    const results = getValueSuggestions('rule.enabled', '');
    expect(results.map((r) => r.label)).toEqual(['true', 'false']);
  });

  it('returns empty array for fields without values', () => {
    expect(getValueSuggestions('episode_id', '')).toHaveLength(0);
  });

  it('returns empty array for unknown fields', () => {
    expect(getValueSuggestions('unknown', '')).toHaveLength(0);
  });

  it('filters values by prefix', () => {
    const results = getValueSuggestions('episode_status', 'act');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('"active"');
  });
});

describe('computeSuggestions', () => {
  it('returns field suggestions when typing a field name', () => {
    const result = computeSuggestions('ep', 2);
    expect(result.isValueMode).toBe(false);
    expect(result.suggestions).toHaveLength(2);
    expect(result.token).toEqual({ token: 'ep', start: 0, end: 2 });
  });

  it('returns value suggestions after "field : "', () => {
    const result = computeSuggestions('episode_status : ', 17);
    expect(result.isValueMode).toBe(true);
    expect(result.suggestions).toHaveLength(4);
  });

  it('returns empty suggestions when nothing matches', () => {
    const result = computeSuggestions('zzz', 3);
    expect(result.suggestions).toHaveLength(0);
    expect(result.token).not.toBeNull();
  });

  it('returns empty suggestions at cursor position 0', () => {
    const result = computeSuggestions('', 0);
    expect(result.suggestions).toHaveLength(0);
    expect(result.token).toBeNull();
  });
});

describe('applyInsertText', () => {
  it('replaces a token at the start of the string', () => {
    const result = applyInsertText('ep', { token: 'ep', start: 0, end: 2 }, 'episode_id');
    expect(result.newValue).toBe('episode_id');
    expect(result.newCursorPos).toBe(10);
  });

  it('replaces a token in the middle of the string', () => {
    const result = applyInsertText('foo and ru', { token: 'ru', start: 8, end: 10 }, 'rule.name');
    expect(result.newValue).toBe('foo and rule.name');
    expect(result.newCursorPos).toBe(17);
  });

  it('inserts at cursor when token is empty (value mode)', () => {
    const result = applyInsertText(
      'episode_status : ',
      { token: '', start: 17, end: 17 },
      '"active"'
    );
    expect(result.newValue).toBe('episode_status : "active"');
    expect(result.newCursorPos).toBe(25);
  });
});
