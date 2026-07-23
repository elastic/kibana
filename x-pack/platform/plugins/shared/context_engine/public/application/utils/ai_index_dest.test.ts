/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndexDest, sanitizeAiIndexName, validateAiIndexName } from './ai_index_dest';

describe('sanitizeAiIndexName', () => {
  it('lowercases the name', () => {
    expect(sanitizeAiIndexName('Support Triage')).toBe('support-triage');
  });

  it('replaces runs of illegal characters with a single hyphen', () => {
    expect(sanitizeAiIndexName('Support: Triage #1')).toBe('support-triage-1');
    expect(sanitizeAiIndexName('a / b \\ c')).toBe('a-b-c');
  });

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeAiIndexName('  #hello#  ')).toBe('hello');
  });

  it('preserves non-ASCII characters', () => {
    expect(sanitizeAiIndexName('日本語')).toBe('日本語');
  });

  it('returns an empty string when nothing valid remains', () => {
    expect(sanitizeAiIndexName('###')).toBe('');
    expect(sanitizeAiIndexName('   ')).toBe('');
  });
});

describe('getAiIndexDest', () => {
  it('prefixes the sanitized name per storage type', () => {
    expect(getAiIndexDest('index', 'Support triage')).toEqual({
      type: 'index',
      value: 'ai-index-idx-support-triage',
    });
    expect(getAiIndexDest('data_stream', 'Support triage')).toEqual({
      type: 'data_stream',
      value: 'ai-index-ds-support-triage',
    });
  });
});

describe('validateAiIndexName', () => {
  it('returns the dest for a valid name', () => {
    expect(validateAiIndexName('index', 'Support triage')).toEqual({
      dest: { type: 'index', value: 'ai-index-idx-support-triage' },
    });
  });

  it('treats an empty name as incomplete: no dest and no error', () => {
    expect(validateAiIndexName('index', '')).toEqual({});
    expect(validateAiIndexName('index', '   ')).toEqual({});
  });

  it('returns an error message when the name sanitizes to nothing', () => {
    const { dest, error } = validateAiIndexName('index', '###');
    expect(dest).toBeUndefined();
    expect(error).toBe('Name must include at least one letter or number.');
  });

  it('returns an error message when the dest exceeds the byte limit', () => {
    const { dest, error } = validateAiIndexName('index', 'a'.repeat(250));
    expect(dest).toBeUndefined();
    expect(error).toBe('Name is too long. Try a shorter name.');
  });

  it('counts bytes, not characters, for the length limit', () => {
    // Each of these characters is 3 bytes in UTF-8, so ~85 of them plus the
    // prefix already exceeds the 255-byte limit.
    expect(validateAiIndexName('index', '本'.repeat(85)).error).toBe(
      'Name is too long. Try a shorter name.'
    );
  });
});
