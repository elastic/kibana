/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeMarkdown, escapeMarkdownValues } from './escape_markdown';

describe('escaping Markdown', () => {
  it('leaves plain text as it is', () => {
    expect(escapeMarkdown('Checkout service 42')).toBe('Checkout service 42');
  });

  it.each([
    ['**bold**', '\\*\\*bold\\*\\*'],
    ['[click](x)', '\\[click\\]\\(x\\)'],
    ['# heading', '\\# heading'],
    ['`code`', '\\`code\\`'],
    ['<b>html</b>', '&lt;b\\>html&lt;/b\\>'],
    ['Tom & Jerry &lt;', 'Tom &amp; Jerry &amp;lt;'],
    ['back\\slash', 'back\\\\slash'],
  ])('shows %s as it is, by escaping what Markdown reads', (text, escaped) => {
    expect(escapeMarkdown(text)).toBe(escaped);
  });

  it('does not make an address a link on its own', () => {
    expect(escapeMarkdown('http://evil.example')).toBe('h\u200bttp://evil\\.example');
    expect(escapeMarkdown('see www.evil.com')).toBe('see w\u200bww\\.evil\\.com');
    expect(escapeMarkdown('HTTPS://x.io')).toBe('H\u200bTTPS://x\\.io');
  });

  it('turns a line break into a space, so a value cannot start a list or a paragraph', () => {
    expect(escapeMarkdown('one\n- two\r\nthree')).toBe('one \\- two three');
  });

  it('escapes the text values of the app and leaves the others as they are', () => {
    expect(escapeMarkdownValues({ name: '*x*', count: 5, on: true })).toEqual({
      name: '\\*x\\*',
      count: 5,
      on: true,
    });
  });
});
