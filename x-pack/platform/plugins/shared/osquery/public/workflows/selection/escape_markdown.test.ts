/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeMarkdown } from './escape_markdown';

describe('escapeMarkdown', () => {
  it('preserves ordinary text', () => {
    expect(escapeMarkdown('My pack 123')).toBe('My pack 123');
  });

  it('leaves names with common punctuation readable', () => {
    expect(escapeMarkdown('rv-twin_v1.2 "quoted"')).toBe('rv-twin_v1.2 "quoted"');
  });

  it('encodes the characters that can start HTML, a link, or code as entities', () => {
    const special = '&<>[]()\\`';
    expect(escapeMarkdown(special)).toBe(
      Array.from(special, (character) => `&#${character.charCodeAt(0)};`).join('')
    );
  });

  it('neutralises a raw tag and a command link', () => {
    expect(escapeMarkdown('<img src=x onerror=alert(1)>')).not.toMatch(/[<>]/);
    expect(escapeMarkdown('[x](command:foo)')).not.toMatch(/[[\]()]/);
  });
});
