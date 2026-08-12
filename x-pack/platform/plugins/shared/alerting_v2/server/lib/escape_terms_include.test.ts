/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTermsIncludePattern, escapeTermsInclude } from './escape_terms_include';

describe('escapeTermsInclude', () => {
  it('leaves plain input untouched', () => {
    expect(escapeTermsInclude('team-payments')).toBe('team-payments');
  });

  it('escapes characters shared with JavaScript regexp syntax', () => {
    expect(escapeTermsInclude('a.b+c')).toBe('a\\.b\\+c');
    expect(escapeTermsInclude('test[foo')).toBe('test\\[foo');
    expect(escapeTermsInclude('a(b)c|d')).toBe('a\\(b\\)c\\|d');
  });

  it('escapes the Elasticsearch-only regexp operators', () => {
    // These would otherwise produce an unparsable pattern (`<`, `"`) or a
    // silently wrong match (`&`, `~`, `@`, `#`).
    expect(escapeTermsInclude('<')).toBe('\\<');
    expect(escapeTermsInclude('a"b')).toBe('a\\"b');
    expect(escapeTermsInclude('a&b')).toBe('a\\&b');
    expect(escapeTermsInclude('a~b')).toBe('a\\~b');
    expect(escapeTermsInclude('a@b')).toBe('a\\@b');
    expect(escapeTermsInclude('a#b')).toBe('a\\#b');
    expect(escapeTermsInclude('a<b>c')).toBe('a\\<b\\>c');
  });

  it('escapes backslashes', () => {
    expect(escapeTermsInclude('a\\b')).toBe('a\\\\b');
  });

  it('returns an empty string for empty input', () => {
    expect(escapeTermsInclude('')).toBe('');
  });
});

describe('buildTermsIncludePattern', () => {
  it('matches anywhere in the term, in any case', () => {
    expect(buildTermsIncludePattern('prod')).toBe('.*[pP][rR][oO][dD].*');
  });

  it('keeps digits and separators literal', () => {
    expect(buildTermsIncludePattern('tag-25')).toBe('.*[tT][aA][gG]-25.*');
  });

  it('escapes regexp operators instead of expanding them', () => {
    expect(buildTermsIncludePattern('a.b')).toBe('.*[aA]\\.[bB].*');
    expect(buildTermsIncludePattern('<x>')).toBe('.*\\<[xX]\\>.*');
  });

  it('normalizes mixed-case input to the same pattern', () => {
    expect(buildTermsIncludePattern('PrOd')).toBe(buildTermsIncludePattern('prod'));
  });

  it('keeps characters whose case mapping is not a single character literal', () => {
    // 'ß'.toUpperCase() is 'SS', which cannot go inside a two-element class.
    expect(buildTermsIncludePattern('ß')).toBe('.*ß.*');
  });

  it('matches every term for empty input', () => {
    expect(buildTermsIncludePattern('')).toBe('.*.*');
  });
});
