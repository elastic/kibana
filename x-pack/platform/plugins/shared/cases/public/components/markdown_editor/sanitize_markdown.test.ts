/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeUnterminatedEntities } from './sanitize_markdown';

describe('escapeUnterminatedEntities', () => {
  it('escapes bare ampersands in query strings', () => {
    expect(escapeUnterminatedEntities('?index=foo&timestamp=bar')).toBe(
      '?index=foo&amp;timestamp=bar'
    );
  });

  it('escapes multiple bare ampersands in one string', () => {
    expect(escapeUnterminatedEntities('a&b&c')).toBe('a&amp;b&amp;c');
  });

  it('preserves named HTML entities', () => {
    const input = '&amp; &lt; &gt; &quot; &apos; &nbsp;';
    expect(escapeUnterminatedEntities(input)).toBe(input);
  });

  it('preserves decimal numeric entities', () => {
    expect(escapeUnterminatedEntities('&#123;')).toBe('&#123;');
  });

  it('preserves hexadecimal numeric entities', () => {
    expect(escapeUnterminatedEntities('&#xAB;')).toBe('&#xAB;');
    expect(escapeUnterminatedEntities('&#xab;')).toBe('&#xab;');
  });

  it('does not double-escape already-escaped ampersands', () => {
    expect(escapeUnterminatedEntities('&amp;')).toBe('&amp;');
    expect(escapeUnterminatedEntities('foo &amp; bar')).toBe('foo &amp; bar');
  });

  it('returns an empty string unchanged', () => {
    expect(escapeUnterminatedEntities('')).toBe('');
  });

  it('returns strings with no ampersands unchanged', () => {
    expect(escapeUnterminatedEntities('hello world')).toBe('hello world');
  });

  it('escapes a lone ampersand', () => {
    expect(escapeUnterminatedEntities('&')).toBe('&amp;');
  });

  it('handles URL-like timestamps from malformed entity bug reports', () => {
    const url =
      'https://example.com/path?index=.internal.alerts-security.alerts-default-000001&timestamp=2026-05-08T17:39:26.459Z';
    expect(escapeUnterminatedEntities(url)).toBe(
      'https://example.com/path?index=.internal.alerts-security.alerts-default-000001&amp;timestamp=2026-05-08T17:39:26.459Z'
    );
  });
});
