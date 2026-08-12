/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeTermsInclude } from './escape_terms_include';

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
