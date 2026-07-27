/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeWildcard } from './escape_wildcard';

describe('escapeWildcard', () => {
  it('leaves input without metacharacters untouched', () => {
    expect(escapeWildcard('alert-summarization')).toBe('alert-summarization');
  });

  it('escapes wildcards, single-character wildcards and backslashes', () => {
    expect(escapeWildcard('my*project?')).toBe('my\\*project\\?');
    expect(escapeWildcard('a\\b')).toBe('a\\\\b');
  });

  it('escapes every occurrence', () => {
    expect(escapeWildcard('**')).toBe('\\*\\*');
  });
});
