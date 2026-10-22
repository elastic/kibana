/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import MarkdownIt from 'markdown-it';

/**
 * Spike E, Tier 4 finding: Kibana's own `Markdown` React component
 * (`kibana_react/public/markdown/markdown.tsx`) does no DOM work itself -- it calls
 * `markdown-it` (a pure string-in/string-out library with no browser API dependency) and
 * hands the result to React via `dangerouslySetInnerHTML`. That means the markdown panel
 * family (new `markdown` embeddable, legacy `markdown_vis`, Canvas `markdown` element, TSVB
 * `markdown` panel) does not need the headless DOM environment at all: this lowers straight
 * to the same HTML string the browser would produce, with no React mount and no jsdom.
 *
 * `html: false` matches the client component's default (and its XSS-mitigation
 * justification for `dangerouslySetInnerHTML`), so raw HTML in the source markdown is
 * escaped rather than passed through here too.
 */
export const renderMarkdownPanel = (markdown: string): string => {
  if (!markdown) return '';
  const md = new MarkdownIt({ html: false, linkify: true });
  return md.render(markdown);
};
