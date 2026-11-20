/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEB_CRAWL_MAX_PATH_RULES, WEB_CRAWL_MAX_PATH_RULE_LENGTH } from '../../common/constants';
import type { PathRules } from './path_rules';
import { NO_PATH_RULES, isPathAllowed, normalizePathPrefixes } from './path_rules';

const ORIGIN = 'https://example.com';

const isAllowed = (path: string, rules: Partial<PathRules>): boolean =>
  isPathAllowed(`${ORIGIN}${path}`, { ...NO_PATH_RULES, ...rules });

const toPaths = (count: number): string[] =>
  Array.from({ length: count }, (_, position) => `/section-${position}`);

describe('path rule limits', () => {
  it('allows 20 paths of 256 characters each', () => {
    expect(WEB_CRAWL_MAX_PATH_RULES).toBe(20);
    expect(WEB_CRAWL_MAX_PATH_RULE_LENGTH).toBe(256);
  });
});

describe('NO_PATH_RULES', () => {
  it('includes and excludes nothing', () => {
    expect(NO_PATH_RULES).toEqual({ includePaths: [], excludePaths: [] });
  });

  it.each(['/', '/docs', '/docs/guide?tab=1', '/blog/2026/01/post'])('allows %s', (path) => {
    expect(isPathAllowed(`${ORIGIN}${path}`, NO_PATH_RULES)).toBe(true);
  });
});

describe('normalizePathPrefixes', () => {
  it('returns an empty list when no paths are given', () => {
    expect(normalizePathPrefixes()).toEqual([]);
    expect(normalizePathPrefixes(undefined)).toEqual([]);
    expect(normalizePathPrefixes([])).toEqual([]);
  });

  it('returns valid paths as they are, in the order given', () => {
    expect(normalizePathPrefixes(['/docs', '/blog/2026', '/'])).toEqual([
      '/docs',
      '/blog/2026',
      '/',
    ]);
  });

  it('trims the paths', () => {
    expect(normalizePathPrefixes(['  /docs', '/blog  ', '\t/shop\n'])).toEqual([
      '/docs',
      '/blog',
      '/shop',
    ]);
  });

  it('drops empty and blank paths', () => {
    expect(normalizePathPrefixes(['', '/docs', '   ', '\n'])).toEqual(['/docs']);
    expect(normalizePathPrefixes(['', '  '])).toEqual([]);
  });

  it('drops duplicates, including paths that only differ by surrounding whitespace', () => {
    expect(normalizePathPrefixes(['/docs', '/blog', '/docs', ' /docs '])).toEqual([
      '/docs',
      '/blog',
    ]);
  });

  it('keeps paths that differ by case or by a trailing slash apart', () => {
    expect(normalizePathPrefixes(['/docs', '/Docs', '/docs/'])).toEqual([
      '/docs',
      '/Docs',
      '/docs/',
    ]);
  });

  it('does not change the list it was given', () => {
    const paths = [' /docs ', '/docs', ''];

    normalizePathPrefixes(paths);

    expect(paths).toEqual([' /docs ', '/docs', '']);
  });

  it.each([
    ['a relative path', 'docs'],
    ['a full URL', 'https://example.com/docs'],
    ['a wildcard', '*/docs'],
    ['a query', '?page=1'],
    ['a relative path with a slash further on', 'docs/guide'],
  ])('returns null for %s', (_, path) => {
    expect(normalizePathPrefixes([path])).toBeNull();
  });

  it('returns null when only one of the paths is not usable', () => {
    expect(normalizePathPrefixes(['/docs', 'blog', '/shop'])).toBeNull();
  });

  it(`accepts a path of ${WEB_CRAWL_MAX_PATH_RULE_LENGTH} characters and returns null for a longer one`, () => {
    const longestPath = `/${'a'.repeat(WEB_CRAWL_MAX_PATH_RULE_LENGTH - 1)}`;

    expect(normalizePathPrefixes([longestPath])).toEqual([longestPath]);
    expect(normalizePathPrefixes([`${longestPath}a`])).toBeNull();
  });

  it('measures the length of a path after trimming it', () => {
    const longestPath = `/${'a'.repeat(WEB_CRAWL_MAX_PATH_RULE_LENGTH - 1)}`;

    expect(normalizePathPrefixes([`   ${longestPath}   `])).toEqual([longestPath]);
  });

  it(`accepts ${WEB_CRAWL_MAX_PATH_RULES} paths and returns null for more`, () => {
    expect(normalizePathPrefixes(toPaths(WEB_CRAWL_MAX_PATH_RULES))).toEqual(
      toPaths(WEB_CRAWL_MAX_PATH_RULES)
    );
    expect(normalizePathPrefixes(toPaths(WEB_CRAWL_MAX_PATH_RULES + 1))).toBeNull();
  });

  it('counts the paths after dropping the empty and duplicate ones', () => {
    const paths = [...toPaths(WEB_CRAWL_MAX_PATH_RULES), '', '  ', '/section-0', ' /section-1 '];

    expect(normalizePathPrefixes(paths)).toEqual(toPaths(WEB_CRAWL_MAX_PATH_RULES));
  });
});

describe('isPathAllowed', () => {
  describe('included paths', () => {
    it('allows only the URLs under an included path', () => {
      const rules = { includePaths: ['/docs'] };

      expect(isAllowed('/docs', rules)).toBe(true);
      expect(isAllowed('/docs/', rules)).toBe(true);
      expect(isAllowed('/docs/guide/intro', rules)).toBe(true);
      expect(isAllowed('/', rules)).toBe(false);
      expect(isAllowed('/blog', rules)).toBe(false);
      expect(isAllowed('/blog/docs', rules)).toBe(false);
    });

    it('allows the URLs under any of the included paths', () => {
      const rules = { includePaths: ['/docs', '/blog'] };

      expect(isAllowed('/docs/a', rules)).toBe(true);
      expect(isAllowed('/blog/a', rules)).toBe(true);
      expect(isAllowed('/shop/a', rules)).toBe(false);
    });

    it('treats a path as a prefix, not as a directory', () => {
      const rules = { includePaths: ['/docs'] };

      expect(isAllowed('/docs-archive', rules)).toBe(true);
      expect(isAllowed('/documentation', rules)).toBe(false);
    });

    it('only matches whole directories when the path ends with a slash', () => {
      const rules = { includePaths: ['/docs/'] };

      expect(isAllowed('/docs/guide', rules)).toBe(true);
      expect(isAllowed('/docs', rules)).toBe(false);
      expect(isAllowed('/docs-archive', rules)).toBe(false);
    });

    it('allows every URL when the root is included', () => {
      expect(isAllowed('/', { includePaths: ['/'] })).toBe(true);
      expect(isAllowed('/anything/at/all', { includePaths: ['/'] })).toBe(true);
    });
  });

  describe('excluded paths', () => {
    it('allows every URL except those under an excluded path', () => {
      const rules = { excludePaths: ['/blog'] };

      expect(isAllowed('/', rules)).toBe(true);
      expect(isAllowed('/docs/blog', rules)).toBe(true);
      expect(isAllowed('/blog', rules)).toBe(false);
      expect(isAllowed('/blog/2026/post', rules)).toBe(false);
    });

    it('rules out the URLs under any of the excluded paths', () => {
      const rules = { excludePaths: ['/blog', '/shop'] };

      expect(isAllowed('/blog/a', rules)).toBe(false);
      expect(isAllowed('/shop/a', rules)).toBe(false);
      expect(isAllowed('/docs/a', rules)).toBe(true);
    });

    it('allows nothing when the root is excluded', () => {
      expect(isAllowed('/', { excludePaths: ['/'] })).toBe(false);
      expect(isAllowed('/docs', { excludePaths: ['/'] })).toBe(false);
    });
  });

  describe('included and excluded paths together', () => {
    it('lets an excluded path win over an included one', () => {
      const rules = { includePaths: ['/docs'], excludePaths: ['/docs/internal'] };

      expect(isAllowed('/docs/guide', rules)).toBe(true);
      expect(isAllowed('/docs/internal', rules)).toBe(false);
      expect(isAllowed('/docs/internal/roadmap', rules)).toBe(false);
      expect(isAllowed('/blog', rules)).toBe(false);
    });

    it('lets the excluded path win even when the included path is the longer one', () => {
      const rules = { includePaths: ['/docs/internal/public'], excludePaths: ['/docs/internal'] };

      expect(isAllowed('/docs/internal/public/page', rules)).toBe(false);
    });

    it('allows nothing when the same path is included and excluded', () => {
      const rules = { includePaths: ['/docs'], excludePaths: ['/docs'] };

      expect(isAllowed('/docs/guide', rules)).toBe(false);
      expect(isAllowed('/blog', rules)).toBe(false);
    });
  });

  describe('matching', () => {
    it('matches the path only, whatever the host, the query or the fragment', () => {
      const rules = { includePaths: ['/docs'], excludePaths: ['/docs/private'] };

      expect(isPathAllowed('http://www.example.org:8080/docs/a', { ...rules })).toBe(true);
      expect(isAllowed('/docs/a?next=/docs/private', rules)).toBe(true);
      expect(isAllowed('/docs/a#/docs/private', rules)).toBe(true);
      expect(isAllowed('/blog?section=/docs', rules)).toBe(false);
      expect(isAllowed('/docs/private?tab=1', rules)).toBe(false);
    });

    it('matches case-sensitively', () => {
      expect(isAllowed('/Docs/a', { includePaths: ['/docs'] })).toBe(false);
      expect(isAllowed('/Blog/a', { excludePaths: ['/blog'] })).toBe(true);
    });

    it('matches against the path as the URL encodes it', () => {
      expect(isAllowed('/caf%C3%A9/menu', { includePaths: ['/caf%C3%A9'] })).toBe(true);
      expect(isAllowed('/caf%C3%A9/menu', { includePaths: ['/café'] })).toBe(false);
    });

    it('matches against the path after `..` segments are resolved', () => {
      expect(isAllowed('/docs/../blog/a', { includePaths: ['/docs'] })).toBe(false);
      expect(isAllowed('/docs/../blog/a', { excludePaths: ['/blog'] })).toBe(false);
    });
  });
});
