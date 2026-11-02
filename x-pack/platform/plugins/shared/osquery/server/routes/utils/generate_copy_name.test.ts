/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateCopyName, escapeFilterValue } from './generate_copy_name';

describe('generateCopyName', () => {
  it('returns _copy when no conflicts', () => {
    expect(generateCopyName('my-query', [])).toBe('my-query_copy');
  });

  it('returns _copy when existing names do not conflict', () => {
    expect(generateCopyName('my-query', ['other-query', 'another-query'])).toBe('my-query_copy');
  });

  it('returns _copy_2 when _copy exists', () => {
    expect(generateCopyName('my-query', ['my-query_copy'])).toBe('my-query_copy_2');
  });

  it('returns _copy_4 when _copy, _copy_2, _copy_3 exist', () => {
    expect(
      generateCopyName('my-query', ['my-query_copy', 'my-query_copy_2', 'my-query_copy_3'])
    ).toBe('my-query_copy_4');
  });

  it('handles gap in numbering (_copy and _copy_3 exist → _copy_4)', () => {
    expect(generateCopyName('my-query', ['my-query_copy', 'my-query_copy_3'])).toBe(
      'my-query_copy_4'
    );
  });

  it('handles only numbered copies without base _copy', () => {
    expect(generateCopyName('my-query', ['my-query_copy_5'])).toBe('my-query_copy');
  });

  it('ignores non-numeric suffixes', () => {
    expect(generateCopyName('my-query', ['my-query_copy', 'my-query_copy_abc'])).toBe(
      'my-query_copy_2'
    );
  });

  it('works with names containing special characters', () => {
    expect(generateCopyName('my query (v2)', ['my query (v2)_copy'])).toBe('my query (v2)_copy_2');
  });
});

describe('escapeFilterValue', () => {
  it('returns the same string when no special characters', () => {
    expect(escapeFilterValue('my-pack')).toBe('my-pack');
  });

  it('escapes double quotes', () => {
    expect(escapeFilterValue('my "pack"')).toBe('my \\"pack\\"');
  });

  it('escapes wildcards', () => {
    expect(escapeFilterValue('my*pack')).toBe('my\\*pack');
  });

  it('escapes backslashes', () => {
    expect(escapeFilterValue('my\\pack')).toBe('my\\\\pack');
  });

  it('escapes combined special characters', () => {
    expect(escapeFilterValue('my "query*" \\ test')).toBe('my \\"query\\*\\" \\\\ test');
  });
});
