/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WEB_CRAWL_MAX_INDEX_NAME_LENGTH,
  WEB_CRAWL_MAX_PATH_RULES,
  WEB_CRAWL_MAX_PATH_RULE_LENGTH,
  WEB_CRAWL_MAX_SEED_URLS,
  WEB_CRAWL_MAX_SITEMAP_URLS,
  WEB_CRAWL_MAX_URL_LENGTH,
} from '../common/constants';
import {
  arePathPrefixesValid,
  areUrlsValid,
  isCrawlableUrl,
  isIntegerInRange,
  isValidIndexName,
  parsePathPrefixes,
  parseUrlList,
} from './validation';

const createPaths = (count: number) => Array.from({ length: count }, (_, index) => `/p${index}`);
const createUrls = (count: number) =>
  Array.from({ length: count }, (_, index) => `https://example.com/p${index}`);
const createUrlOfLength = (length: number) => {
  const prefix = 'https://example.com/';
  return `${prefix}${'a'.repeat(length - prefix.length)}`;
};

describe('isIntegerInRange', () => {
  it.each([
    [0, 0, 5],
    [5, 0, 5],
    [3, 0, 5],
    [1, 1, 1],
    [-2, -3, -1],
  ])('accepts %p between %p and %p', (value, min, max) => {
    expect(isIntegerInRange(value, min, max)).toBe(true);
  });

  it.each([
    [-1, 0, 5],
    [6, 0, 5],
    [1.5, 0, 5],
    [NaN, 0, 5],
    [Infinity, 0, 5],
    [-Infinity, 0, 5],
    [3, 5, 0],
  ])('rejects %p between %p and %p', (value, min, max) => {
    expect(isIntegerInRange(value, min, max)).toBe(false);
  });
});

describe('isCrawlableUrl', () => {
  it.each([
    'https://example.com',
    'http://example.com',
    'HTTPS://EXAMPLE.COM',
    'https://example.com/docs?page=2#top',
    'http://localhost:8080/path',
  ])('accepts %p', (url) => {
    expect(isCrawlableUrl(url)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'example.com',
    '/docs',
    'not a url',
    'ftp://example.com',
    'file:///etc/hosts',
    'mailto:someone@example.com',
    'data:text/html,docs',
    'ws://example.com',
    'https://',
  ])('rejects %p', (url) => {
    expect(isCrawlableUrl(url)).toBe(false);
  });
});

describe('parsePathPrefixes', () => {
  it.each(['', ' ', '   ', ',', ', ,', ' ,\n,\t '])('reads %p as no paths', (text) => {
    expect(parsePathPrefixes(text)).toEqual([]);
  });

  it('reads a single path', () => {
    expect(parsePathPrefixes('/docs')).toEqual(['/docs']);
  });

  it.each([
    ['commas', '/docs,/blog,/guide'],
    ['commas and spaces', '/docs, /blog, /guide'],
    ['spaces', '/docs /blog /guide'],
    ['tabs', '/docs\t/blog\t/guide'],
    ['line breaks', '/docs\n/blog\r\n/guide'],
    ['a mix of separators', '/docs,/blog   /guide'],
    ['repeated separators', '/docs,,, /blog , ,/guide'],
  ])('splits on %s', (_, text) => {
    expect(parsePathPrefixes(text)).toEqual(['/docs', '/blog', '/guide']);
  });

  it('ignores leading and trailing separators', () => {
    expect(parsePathPrefixes(' , /docs, /blog,\n')).toEqual(['/docs', '/blog']);
  });

  it('drops repeated paths, keeping the first occurrence in order', () => {
    expect(parsePathPrefixes('/blog, /docs, /blog /docs, /guide')).toEqual([
      '/blog',
      '/docs',
      '/guide',
    ]);
  });

  it('treats paths that differ in case or a trailing slash as different', () => {
    expect(parsePathPrefixes('/docs, /Docs, /docs/')).toEqual(['/docs', '/Docs', '/docs/']);
  });

  it('keeps entries that are not valid paths, for validation to reject', () => {
    expect(parsePathPrefixes('docs, /blog')).toEqual(['docs', '/blog']);
  });
});

describe('arePathPrefixesValid', () => {
  it('accepts no paths', () => {
    expect(arePathPrefixesValid([])).toBe(true);
  });

  it.each([['/'], ['/docs'], ['/docs/guide/'], ['/a-b_c.d~e%20f']])('accepts %p', (path) => {
    expect(arePathPrefixesValid([path])).toBe(true);
  });

  it.each([['docs'], ['docs/'], ['*'], ['https://example.com/docs'], ['./docs'], ['']])(
    'rejects %p, which does not start with a slash',
    (path) => {
      expect(arePathPrefixesValid([path])).toBe(false);
    }
  );

  it('rejects a list with one invalid path among valid ones', () => {
    expect(arePathPrefixesValid(['/docs', 'blog', '/guide'])).toBe(false);
  });

  it('accepts as many paths as the limit allows and rejects one more', () => {
    expect(WEB_CRAWL_MAX_PATH_RULES).toBe(20);
    expect(arePathPrefixesValid(createPaths(20))).toBe(true);
    expect(arePathPrefixesValid(createPaths(21))).toBe(false);
  });

  it('accepts a path as long as the limit allows and rejects one character more', () => {
    expect(WEB_CRAWL_MAX_PATH_RULE_LENGTH).toBe(256);
    const longestPath = `/${'a'.repeat(255)}`;

    expect(longestPath).toHaveLength(256);
    expect(arePathPrefixesValid([longestPath])).toBe(true);
    expect(arePathPrefixesValid([`${longestPath}a`])).toBe(false);
  });

  it('rejects one path that is too long among valid ones', () => {
    expect(arePathPrefixesValid(['/docs', `/${'a'.repeat(256)}`])).toBe(false);
  });

  it('accepts 20 paths of 256 characters', () => {
    const paths = Array.from(
      { length: 20 },
      (_, index) => `/${String(index).padStart(2, '0')}${'a'.repeat(253)}`
    );

    expect(arePathPrefixesValid(paths)).toBe(true);
  });

  it('validates what was parsed from text with more than 20 entries but 20 distinct paths', () => {
    const paths = createPaths(20);

    expect(arePathPrefixesValid(parsePathPrefixes([...paths, ...paths].join(', ')))).toBe(true);
    expect(arePathPrefixesValid(parsePathPrefixes([...paths, '/extra'].join(' ')))).toBe(false);
  });
});

describe('parseUrlList', () => {
  it.each(['', ' ', '   ', '\n', ' \t\r\n '])('reads %p as no URLs', (text) => {
    expect(parseUrlList(text)).toEqual([]);
  });

  it('reads a single URL', () => {
    expect(parseUrlList('https://example.com/blog')).toEqual(['https://example.com/blog']);
  });

  it.each([
    ['spaces', 'https://a.example https://b.example/docs http://c.example'],
    ['repeated spaces', 'https://a.example   https://b.example/docs  http://c.example'],
    ['tabs', 'https://a.example\thttps://b.example/docs\thttp://c.example'],
    ['line breaks', 'https://a.example\nhttps://b.example/docs\r\nhttp://c.example'],
    ['commas', 'https://a.example,https://b.example/docs,http://c.example'],
    ['commas and spaces', 'https://a.example, https://b.example/docs, http://c.example'],
    ['spaces before commas', 'https://a.example ,https://b.example/docs , http://c.example'],
    ['a mix of separators', 'https://a.example,https://b.example/docs\n http://c.example'],
  ])('splits on %s', (_, text) => {
    expect(parseUrlList(text)).toEqual([
      'https://a.example',
      'https://b.example/docs',
      'http://c.example',
    ]);
  });

  it('ignores leading and trailing whitespace', () => {
    expect(parseUrlList('  https://a.example https://b.example \n')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('ignores a comma in front of the first URL', () => {
    expect(parseUrlList(',https://a.example')).toEqual(['https://a.example']);
  });

  it('keeps the commas inside a URL', () => {
    expect(
      parseUrlList('https://a.example/x,y https://b.example/?ids=1,2,3, https://c.example/a,b')
    ).toEqual(['https://a.example/x,y', 'https://b.example/?ids=1,2,3', 'https://c.example/a,b']);
  });

  it('does not split on a comma that is not followed by a URL', () => {
    expect(parseUrlList('https://a.example/?tags=news,sports')).toEqual([
      'https://a.example/?tags=news,sports',
    ]);
  });

  it('drops repeated URLs, keeping the first occurrence in order', () => {
    expect(
      parseUrlList('https://b.example https://a.example, https://b.example\nhttps://a.example')
    ).toEqual(['https://b.example', 'https://a.example']);
  });

  it('treats URLs that differ in case, scheme or a trailing slash as different', () => {
    expect(
      parseUrlList(
        'https://a.example https://a.example/ http://a.example https://a.example/Docs https://a.example/docs'
      )
    ).toEqual([
      'https://a.example',
      'https://a.example/',
      'http://a.example',
      'https://a.example/Docs',
      'https://a.example/docs',
    ]);
  });

  it('keeps entries that are not crawlable URLs, for validation to reject', () => {
    expect(parseUrlList('example.com ftp://a.example https://b.example')).toEqual([
      'example.com',
      'ftp://a.example',
      'https://b.example',
    ]);
  });
});

describe('areUrlsValid', () => {
  it('accepts no URLs', () => {
    expect(areUrlsValid([], WEB_CRAWL_MAX_SEED_URLS)).toBe(true);
    expect(areUrlsValid([], 0)).toBe(true);
  });

  it.each([
    'https://example.com',
    'http://example.com',
    'HTTPS://EXAMPLE.COM',
    'https://example.com/docs?ids=1,2#top',
    'http://localhost:8080/sitemap.xml',
  ])('accepts %p', (url) => {
    expect(areUrlsValid([url], 20)).toBe(true);
  });

  it.each([
    '',
    'example.com',
    '/sitemap.xml',
    'ftp://example.com',
    'file:///etc/hosts',
    'mailto:someone@example.com',
    'data:text/html,docs',
    'https://',
    ',',
  ])('rejects %p', (url) => {
    expect(areUrlsValid([url], 20)).toBe(false);
  });

  it('rejects a list with one invalid URL among valid ones', () => {
    expect(areUrlsValid(['https://a.example', 'ftp://b.example', 'https://c.example'], 20)).toBe(
      false
    );
  });

  it('allows 20 start URLs and 20 sitemap URLs', () => {
    expect(WEB_CRAWL_MAX_SEED_URLS).toBe(20);
    expect(WEB_CRAWL_MAX_SITEMAP_URLS).toBe(20);
  });

  it('accepts as many URLs as the given limit allows and rejects one more', () => {
    expect(areUrlsValid(createUrls(20), 20)).toBe(true);
    expect(areUrlsValid(createUrls(21), 20)).toBe(false);
  });

  it('applies the limit it is given', () => {
    expect(areUrlsValid(createUrls(2), 2)).toBe(true);
    expect(areUrlsValid(createUrls(3), 2)).toBe(false);
    expect(areUrlsValid(createUrls(1), 0)).toBe(false);
  });

  it('accepts a URL as long as the limit allows and rejects one character more', () => {
    expect(WEB_CRAWL_MAX_URL_LENGTH).toBe(2048);
    const longestUrl = createUrlOfLength(2048);

    expect(longestUrl).toHaveLength(2048);
    expect(areUrlsValid([longestUrl], 20)).toBe(true);
    expect(areUrlsValid([`${longestUrl}a`], 20)).toBe(false);
  });

  it('rejects one URL that is too long among valid ones', () => {
    expect(areUrlsValid(['https://a.example', createUrlOfLength(2049)], 20)).toBe(false);
  });

  it('accepts 20 URLs of 2048 characters', () => {
    const urls = Array.from(
      { length: 20 },
      (_, index) => `${createUrlOfLength(2046)}${String(index).padStart(2, '0')}`
    );

    expect(urls.every((url) => url.length === 2048)).toBe(true);
    expect(areUrlsValid(urls, 20)).toBe(true);
  });

  it('validates what was parsed from text with more than 20 entries but 20 distinct URLs', () => {
    const urls = createUrls(20);

    expect(areUrlsValid(parseUrlList([...urls, ...urls].join(' ')), 20)).toBe(true);
    expect(areUrlsValid(parseUrlList([...urls, 'https://extra.example'].join(', ')), 20)).toBe(
      false
    );
  });
});

describe('isValidIndexName', () => {
  it.each([
    'a',
    '0',
    'docs',
    'web-crawl-example-com',
    'web_crawl.docs-2026',
    '9lives',
    'a.',
    'a-',
    'a_',
    'a..b--c__d',
  ])('accepts %p', (indexName) => {
    expect(isValidIndexName(indexName)).toBe(true);
  });

  it('rejects an empty name, which the caller reads as the default index', () => {
    expect(isValidIndexName('')).toBe(false);
  });

  it.each(['Docs', 'docS', 'WEB-CRAWL', 'web-Crawl-docs'])(
    'rejects %p, which has an uppercase letter',
    (indexName) => {
      expect(isValidIndexName(indexName)).toBe(false);
    }
  );

  it.each(['.docs', '-docs', '_docs', '.', '-', '_', '..'])(
    'rejects %p, which does not start with a lowercase letter or a digit',
    (indexName) => {
      expect(isValidIndexName(indexName)).toBe(false);
    }
  );

  it.each([' ', 'my docs', ' docs', 'docs ', 'docs\t', 'docs\n', '\ndocs'])(
    'rejects %p, which has whitespace',
    (indexName) => {
      expect(isValidIndexName(indexName)).toBe(false);
    }
  );

  it.each([
    'docs*',
    'docs,blog',
    'docs/blog',
    'docs\\blog',
    'docs:blog',
    'docs#1',
    'docs?',
    '"docs"',
    '<docs>',
    'docs|blog',
    'docs+blog',
    'dócs',
    'ドキュメント',
  ])('rejects %p, which has a character an index name cannot have', (indexName) => {
    expect(isValidIndexName(indexName)).toBe(false);
  });

  it('accepts a name as long as the limit allows and rejects one character more', () => {
    expect(WEB_CRAWL_MAX_INDEX_NAME_LENGTH).toBe(255);
    const longestName = 'a'.repeat(255);

    expect(isValidIndexName(longestName)).toBe(true);
    expect(isValidIndexName(`${longestName}a`)).toBe(false);
  });
});

describe('URL lists with stray commas', () => {
  it.each([
    ['https://a.example, https://b.example,', ['https://a.example', 'https://b.example']],
    ['https://a.example,, https://b.example', ['https://a.example', 'https://b.example']],
    ['https://a.example,HTTPS://b.example', ['https://a.example', 'HTTPS://b.example']],
    [' , ', []],
    ['https://a.example/?ids=1,2,3', ['https://a.example/?ids=1,2,3']],
  ])('reads %p as %p', (text, expected) => {
    expect(parseUrlList(text)).toEqual(expected);
  });

  it('refuses a URL whose host holds a comma, which is a list that was not split', () => {
    const urls = parseUrlList('https://a.example,example.org');

    expect(urls).toEqual(['https://a.example,example.org']);
    expect(areUrlsValid(urls, 20)).toBe(false);
  });
});
