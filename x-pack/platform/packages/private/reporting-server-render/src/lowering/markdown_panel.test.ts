/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderMarkdownPanel } from './markdown_panel';

describe('renderMarkdownPanel (Spike E, Tier 4)', () => {
  it('renders markdown to the same shape of HTML the client Markdown component produces', () => {
    expect(renderMarkdownPanel('# Title\n\nSome **bold** text.')).toBe(
      '<h1>Title</h1>\n<p>Some <strong>bold</strong> text.</p>\n'
    );
  });

  it('escapes raw HTML in the source (html: false, matching the client default)', () => {
    expect(renderMarkdownPanel('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('returns an empty string for empty input', () => {
    expect(renderMarkdownPanel('')).toBe('');
  });
});
