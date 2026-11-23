/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEB_CRAWL_MAX_PATH_RULES, WEB_CRAWL_MAX_PATH_RULE_LENGTH } from '../../common/constants';
import type { PathRules } from './path_rules';
import { NO_PATH_RULES, isPathAllowed, normalizePathPrefixes } from './path_rules';

const isAllowed = (path: string, rules: Partial<PathRules>): boolean =>
  isPathAllowed(`https://example.com${path}`, { ...NO_PATH_RULES, ...rules });

const toPaths = (count: number): string[] =>
  Array.from({ length: count }, (_, position) => `/section-${position}`);

describe('normalizePathPrefixes', () => {
  it('returns an empty list when no paths are given', () => {
    expect(normalizePathPrefixes()).toEqual([]);
    expect(normalizePathPrefixes(['', '  '])).toEqual([]);
  });

  it('trims the paths and drops the blank and duplicate ones, keeping their order', () => {
    expect(
      normalizePathPrefixes(['  /docs', '/blog/2026  ', '', '/docs', '\t/Docs\n', '/docs/', '/'])
    ).toEqual(['/docs', '/blog/2026', '/Docs', '/docs/', '/']);
  });

  it.each(['docs', 'https://example.com/docs', '*/docs', '?page=1'])(
    'returns null when a path is %s, which does not start with a slash',
    (path) => {
      expect(normalizePathPrefixes(['/docs', path])).toBeNull();
    }
  );

  it('returns null for a path that is too long once trimmed', () => {
    const longestPath = `/${'a'.repeat(WEB_CRAWL_MAX_PATH_RULE_LENGTH - 1)}`;

    expect(normalizePathPrefixes([`  ${longestPath}  `])).toEqual([longestPath]);
    expect(normalizePathPrefixes([`${longestPath}a`])).toBeNull();
  });

  it('returns null for too many paths, counted without the blank and duplicate ones', () => {
    const paths = toPaths(WEB_CRAWL_MAX_PATH_RULES);

    expect(normalizePathPrefixes([...paths, '', ' /section-0 '])).toEqual(paths);
    expect(normalizePathPrefixes(toPaths(WEB_CRAWL_MAX_PATH_RULES + 1))).toBeNull();
  });
});

describe('isPathAllowed', () => {
  it('allows every URL when there are no rules', () => {
    expect(isAllowed('/', {})).toBe(true);
    expect(isAllowed('/blog/2026/01/post?tab=1', {})).toBe(true);
  });

  it('allows only the URLs whose path starts with one of the included paths', () => {
    const rules = { includePaths: ['/docs', '/blog/'] };

    expect(isAllowed('/docs', rules)).toBe(true);
    expect(isAllowed('/docs/guide/intro', rules)).toBe(true);
    expect(isAllowed('/docs-archive', rules)).toBe(true);
    expect(isAllowed('/blog/post', rules)).toBe(true);
    expect(isAllowed('/blog', rules)).toBe(false);
    expect(isAllowed('/', rules)).toBe(false);
    expect(isAllowed('/shop/docs', rules)).toBe(false);
    expect(isAllowed('/Docs', rules)).toBe(false);
  });

  it('allows every URL except those under an excluded path', () => {
    const rules = { excludePaths: ['/blog', '/shop'] };

    expect(isAllowed('/', rules)).toBe(true);
    expect(isAllowed('/docs/blog', rules)).toBe(true);
    expect(isAllowed('/blog', rules)).toBe(false);
    expect(isAllowed('/shop/item', rules)).toBe(false);
    expect(isAllowed('/docs', { excludePaths: ['/'] })).toBe(false);
  });

  it('lets an excluded path win over an included one, even a longer one', () => {
    const rules = {
      includePaths: ['/docs', '/docs/internal/public'],
      excludePaths: ['/docs/internal'],
    };

    expect(isAllowed('/docs/guide', rules)).toBe(true);
    expect(isAllowed('/docs/internal/roadmap', rules)).toBe(false);
    expect(isAllowed('/docs/internal/public/page', rules)).toBe(false);
    expect(isAllowed('/blog', rules)).toBe(false);
  });

  it('matches the resolved path only, whatever the host, the query or the fragment', () => {
    const rules = { includePaths: ['/docs'], excludePaths: ['/docs/private'] };

    expect(isPathAllowed('http://www.example.org:8080/docs/a', rules)).toBe(true);
    expect(isAllowed('/docs/a?next=/docs/private', rules)).toBe(true);
    expect(isAllowed('/docs/a#/docs/private', rules)).toBe(true);
    expect(isAllowed('/blog?section=/docs', rules)).toBe(false);
    expect(isAllowed('/docs/private?tab=1', rules)).toBe(false);
    expect(isAllowed('/docs/../blog/a', rules)).toBe(false);
  });
});
