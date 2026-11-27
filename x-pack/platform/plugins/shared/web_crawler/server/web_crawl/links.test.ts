/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEB_CRAWL_FILE_EXTENSIONS } from '../../common/constants';
import {
  extractLinks,
  getPageKey,
  getSiteKey,
  getUrlFields,
  isSameSitePage,
  iterateLinkTargets,
  normalizeFileExtensions,
  normalizeUrl,
} from './links';

const ORIGIN = 'https://example.com';
const PAGE_URL = `${ORIGIN}/docs/guide/intro`;
const SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

const toPath = (segmentCount: number): string =>
  Array.from({ length: segmentCount }, (_, segment) => `/s${segment}`).join('');

const toQuery = (paramCount: number): string =>
  Array.from({ length: paramCount }, (_, param) => `p${param}=${param}`).join('&');

describe('normalizeUrl', () => {
  it('returns absolute http(s) URLs without fragment or credentials', () => {
    expect(normalizeUrl('http://example.com/a?b=c')).toBe('http://example.com/a?b=c');
    expect(normalizeUrl(ORIGIN)).toBe(`${ORIGIN}/`);
    expect(normalizeUrl('https://user:secret@example.com/a?b=c#section')).toBe(`${ORIGIN}/a?b=c`);
  });

  it.each(['ftp://example.com/file', 'file:///etc/passwd', SCRIPT_URL, 'mailto:a@example.com'])(
    'rejects the non-http(s) URL %s',
    (url) => {
      expect(normalizeUrl(url)).toBeNull();
      expect(normalizeUrl(url, PAGE_URL)).toBeNull();
    }
  );

  it('rejects what cannot be resolved without a base URL', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('/relative/path')).toBeNull();
    expect(normalizeUrl('example.com')).toBeNull();
  });

  it('resolves relative URLs against the base URL', () => {
    expect(normalizeUrl('/root', PAGE_URL)).toBe(`${ORIGIN}/root`);
    expect(normalizeUrl('sibling', PAGE_URL)).toBe(`${ORIGIN}/docs/guide/sibling`);
    expect(normalizeUrl('../up', PAGE_URL)).toBe(`${ORIGIN}/docs/up`);
    expect(normalizeUrl('?page=2', PAGE_URL)).toBe(`${PAGE_URL}?page=2`);
    expect(normalizeUrl('//other.example.org/x', PAGE_URL)).toBe('https://other.example.org/x');
    expect(normalizeUrl('#top', PAGE_URL)).toBe(PAGE_URL);
  });

  it('rejects URLs longer than 2048 characters, before and after resolving them', () => {
    const prefix = `${ORIGIN}/`;

    expect(normalizeUrl(`${prefix}${'a'.repeat(2048 - prefix.length)}`)).toHaveLength(2048);
    expect(normalizeUrl(`${prefix}${'a'.repeat(2049 - prefix.length)}`)).toBeNull();
    expect(normalizeUrl('a'.repeat(2040), PAGE_URL)).toBeNull();
  });

  describe('URL traps', () => {
    it('accepts a path of 16 segments, not counting empty ones, and rejects one of 17', () => {
      expect(normalizeUrl(`${ORIGIN}${toPath(16)}`)).toBe(`${ORIGIN}${toPath(16)}`);
      expect(normalizeUrl(`${ORIGIN}//${toPath(16)}//`)).toBe(`${ORIGIN}//${toPath(16)}//`);
      expect(normalizeUrl(`${ORIGIN}${toPath(17)}`)).toBeNull();
    });

    it('counts the path segments after resolving a relative URL', () => {
      const baseUrl = `${ORIGIN}${toPath(15)}/page`;

      expect(normalizeUrl('sibling', baseUrl)).toBe(`${ORIGIN}${toPath(15)}/sibling`);
      expect(normalizeUrl('child/page', baseUrl)).toBeNull();
      expect(normalizeUrl('../../child/page', baseUrl)).toBe(`${ORIGIN}${toPath(13)}/child/page`);
    });

    it('accepts 10 query parameters and rejects 11, counting repeated ones', () => {
      const repeated = Array.from({ length: 11 }, () => 'tag=a').join('&');

      expect(normalizeUrl(`${ORIGIN}/a?${toQuery(10)}`)).toBe(`${ORIGIN}/a?${toQuery(10)}`);
      expect(normalizeUrl(`${ORIGIN}/a?${toQuery(11)}`)).toBeNull();
      expect(normalizeUrl(`${ORIGIN}/a?${repeated}`)).toBeNull();
    });

    it('does not count what is in the fragment', () => {
      expect(normalizeUrl(`${ORIGIN}/a#${toPath(17)}?${toQuery(11)}`)).toBe(`${ORIGIN}/a`);
    });

    it('does not hold a URL the user asked for to the trap limits', () => {
      const options = { isDiscovered: false };

      for (const url of [`${ORIGIN}${toPath(17)}`, `${ORIGIN}/?${toQuery(11)}`]) {
        expect(normalizeUrl(url)).toBeNull();
        expect(normalizeUrl(url, undefined, options)).toBe(url);
      }
      expect(normalizeUrl('ftp://example.com/', undefined, options)).toBeNull();
      expect(normalizeUrl(`${ORIGIN}/${'a'.repeat(2048)}`, undefined, options)).toBeNull();
    });
  });
});

describe('getUrlFields', () => {
  it('returns the host, the path and the first three directories', () => {
    expect(getUrlFields('https://WWW.Example.com:8443/Docs/guide/intro/install?tab=1#top')).toEqual(
      {
        url_host: 'www.example.com',
        url_path: '/Docs/guide/intro/install',
        url_path_dir1: 'Docs',
        url_path_dir2: 'guide',
        url_path_dir3: 'intro',
      }
    );
  });

  it('leaves the directories that the path does not have undefined', () => {
    expect(getUrlFields(`${ORIGIN}/`)).toEqual({ url_host: 'example.com', url_path: '/' });
    expect(getUrlFields(`${ORIGIN}//docs//guide/`)).toEqual({
      url_host: 'example.com',
      url_path: '//docs//guide/',
      url_path_dir1: 'docs',
      url_path_dir2: 'guide',
    });
  });
});

describe('getSiteKey', () => {
  it('returns the hostname, treating only the www. host as the bare host', () => {
    expect(getSiteKey('https://example.com:8443/a/b?c=d')).toBe('example.com');
    expect(getSiteKey('https://www.example.com/')).toBe('example.com');
    expect(getSiteKey('https://docs.example.com/')).toBe('docs.example.com');
    expect(getSiteKey('https://wwwexample.com/')).toBe('wwwexample.com');
  });
});

describe('getPageKey', () => {
  it.each([
    ['http://example.com/docs', 'https://example.com/docs'],
    ['https://example.com/docs/', 'https://example.com/docs'],
    ['http://example.com', 'https://example.com/'],
    ['https://example.com/docs/?page=2', 'https://example.com/docs?page=2'],
    ['https://example.com:443/docs', 'https://example.com/docs'],
  ])('is the same for %s and %s', (url, otherUrl) => {
    expect(getPageKey(url)).toBe(getPageKey(otherUrl));
  });

  it.each([
    ['https://example.com/docs', 'https://example.com/Docs'],
    ['https://example.com/docs', 'https://example.com/docs?page=2'],
    ['https://example.com/docs?a=1&b=2', 'https://example.com/docs?b=2&a=1'],
    ['https://example.com/docs', 'https://www.example.com/docs'],
    ['https://example.com/docs', 'https://example.com:8443/docs'],
    ['https://example.com/docs', 'https://example.com/docs//'],
  ])('differs between %s and %s', (url, otherUrl) => {
    expect(getPageKey(url)).not.toBe(getPageKey(otherUrl));
  });
});

describe('isSameSitePage', () => {
  it('accepts the pages of the site and rejects other sites and binary assets', () => {
    const accepted = [
      `${ORIGIN}/`,
      'http://www.example.com:8443/docs/page?query=1',
      `${ORIGIN}/page.html`,
      `${ORIGIN}/docs/v1.2/`,
      `${ORIGIN}/releases/v2.zip/notes`,
    ];
    const rejected = [
      'https://docs.example.com/page',
      'https://example.com.evil.org/page',
      'https://notexample.com/page',
      `${ORIGIN}/report.pdf`,
      `${ORIGIN}/photo.JPG`,
      `${ORIGIN}/archive.tar.gz`,
      `${ORIGIN}/app.js?v=3`,
    ];

    expect(accepted.filter((url) => !isSameSitePage(url, 'example.com'))).toEqual([]);
    expect(rejected.filter((url) => isSameSitePage(url, 'example.com'))).toEqual([]);
    expect(isSameSitePage(`${ORIGIN}/page`, 'www.example.com')).toBe(false);
  });

  it('accepts the files whose extension is asked for, whatever its case, and no others', () => {
    const fileExtensions = ['pdf', 'jpg'];
    const isPage = (url: string) => isSameSitePage(url, 'example.com', fileExtensions);

    expect(isPage(`${ORIGIN}/report.pdf`)).toBe(true);
    expect(isPage(`${ORIGIN}/photo.JPG?size=large`)).toBe(true);
    expect(isPage(`${ORIGIN}/page.html`)).toBe(true);
    expect(isPage(`${ORIGIN}/notes.docx`)).toBe(false);
    expect(isPage(`${ORIGIN}/archive.tar.gz`)).toBe(false);
    expect(isPage('https://other.org/report.pdf')).toBe(false);
    expect(isSameSitePage(`${ORIGIN}/app.js`, 'example.com', ['js'])).toBe(true);
  });
});

describe('normalizeFileExtensions', () => {
  it('lowercases, trims and de-duplicates extensions, with or without their dot', () => {
    expect(normalizeFileExtensions(['PDF', ' .docx ', 'pdf', '.Pdf'])).toEqual(['pdf', 'docx']);
    expect(normalizeFileExtensions([...WEB_CRAWL_FILE_EXTENSIONS])).toEqual([
      ...WEB_CRAWL_FILE_EXTENSIONS,
    ]);
    expect(normalizeFileExtensions([])).toEqual([]);
    expect(normalizeFileExtensions()).toEqual([]);
  });

  it.each(['zip', 'html', '', '..pdf', 'pdf,docx'])('rejects %p', (extension) => {
    expect(normalizeFileExtensions(['pdf', extension])).toBeNull();
  });
});

describe('iterateLinkTargets', () => {
  it('yields the raw target of every link, in document order and without its title', () => {
    const markdown = [
      '# Title (with parentheses) and [brackets]',
      '[absolute](https://example.com/a#section)',
      '[mail](mailto:someone@example.com)',
      '[![logo](/logo.png)](/home)',
      '[repeated](/a) and [repeated](/a)',
      '[titled](/b "Title") [tab](/c\t\'Title\') [newline](/d\n"Title")',
    ].join('\n');

    expect([...iterateLinkTargets(markdown)]).toEqual([
      'https://example.com/a#section',
      'mailto:someone@example.com',
      '/logo.png',
      '/home',
      '/a',
      '/a',
      '/b',
      '/c',
      '/d',
    ]);
  });

  it('reads a target in angle brackets up to the closing bracket, spaces and parentheses included', () => {
    const markdown = [
      '[guide](<https://example.com/guide>)',
      '[spaced](</my page (draft)> "Title")',
      '[unclosed](</broken\n[next](/next)',
      '[empty](<>)',
    ].join('\n');

    expect([...iterateLinkTargets(markdown)]).toEqual([
      'https://example.com/guide',
      '/my page (draft)',
      '/next',
    ]);
  });

  it('skips empty, unterminated and overlong targets, and keeps scanning after them', () => {
    const longest = `/${'a'.repeat(2046)}`;
    const markdown = [
      '[empty]()',
      '[space]( /after-space)',
      `[too long](${longest}a)`,
      `[longest](${longest})`,
      '[unterminated](/unterminated',
    ].join('\n');

    expect([...iterateLinkTargets(markdown)]).toEqual([longest]);
    expect([...iterateLinkTargets('trailing ](')]).toEqual([]);
  });
});

describe('extractLinks', () => {
  it('keeps the balanced parentheses of a link target', () => {
    const markdown = [
      '[article](/wiki/Mercury_(planet)) ([aside](/wiki/Venus))',
      '[nested](/wiki/A_(b_(c))_d) [unbalanced](/wiki/Open_(paren "title")',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      `${ORIGIN}/wiki/Mercury_(planet)`,
      `${ORIGIN}/wiki/Venus`,
      `${ORIGIN}/wiki/A_(b_(c))_d`,
      `${ORIGIN}/wiki/Open_(paren`,
    ]);
  });

  it('returns the absolute and relative links of a page, without duplicates', () => {
    const markdown = [
      '[absolute](https://example.com/absolute) [root](/root) [sibling](sibling) [up](../up)',
      '[again](/root) [fragment](/root#section) [credentials](https://user:secret@example.com/root)',
      '[query](/root?query=1)',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      `${ORIGIN}/absolute`,
      `${ORIGIN}/root`,
      `${ORIGIN}/docs/guide/sibling`,
      `${ORIGIN}/docs/up`,
      `${ORIGIN}/root?query=1`,
    ]);
    expect(extractLinks('# Title\n\nNo [links] (here).', PAGE_URL)).toEqual([]);
  });

  it('collects linked files of the extensions it is given', () => {
    const markdown = '[page](/a) [report](/files/report.pdf) [![logo](/logo.png)](/notes.docx)';

    expect(extractLinks(markdown, PAGE_URL)).toEqual([`${ORIGIN}/a`]);
    expect(extractLinks(markdown, PAGE_URL, ['pdf', 'docx'])).toEqual([
      `${ORIGIN}/a`,
      `${ORIGIN}/files/report.pdf`,
      `${ORIGIN}/notes.docx`,
    ]);
  });

  it('only keeps links to the same site, whatever the protocol, the port or the www. prefix', () => {
    const markdown = [
      '[www](https://www.example.com/www)',
      '[http](http://example.com/http)',
      '[port](https://example.com:8443/port)',
      '[other](https://other.org/page)',
      '[subdomain](https://docs.example.com/page)',
      '[lookalike](https://example.com.evil.org/page)',
      '[protocol relative](//cdn.example.net/page)',
    ].join(' ');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      'https://www.example.com/www',
      'http://example.com/http',
      'https://example.com:8443/port',
    ]);
    expect(extractLinks('[a](https://example.com/a)', 'https://www.example.com/')).toEqual([
      `${ORIGIN}/a`,
    ]);
  });

  it('skips links that are not crawlable pages', () => {
    const markdown = [
      '[mail](mailto:someone@example.com) [js](javascript:void(0)) [ftp](ftp://example.com/a)',
      '[bad host](https://exa mple.com/a) [bad port](https://example.com:port/a)',
      `[deep](${toPath(17)}) [calendar](/events?${toQuery(11)})`,
      '[pdf](/files/REPORT.PDF) [image](/img/photo.jpeg?size=large) [archive](/release.tar.gz)',
      '[style](/assets/site.css#top) [feed](/feed.xml)',
      '[fine](/events?month=5) [html](/files/report.html) [versioned](/docs/v1.2/)',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      `${ORIGIN}/events?month=5`,
      `${ORIGIN}/files/report.html`,
      `${ORIGIN}/docs/v1.2/`,
    ]);
  });

  it('returns at most 2000 links per page', () => {
    const markdown = Array.from({ length: 2500 }, (_, i) => `[page ${i}](/page-${i})`).join('\n');

    const links = extractLinks(markdown, PAGE_URL);

    expect(links).toHaveLength(2000);
    expect(links[1999]).toBe(`${ORIGIN}/page-1999`);
  });

  it('stays fast on pathological documents', () => {
    const startedAt = performance.now();
    const links = [
      ...extractLinks(']('.repeat(512 * 1024), PAGE_URL),
      ...extractLinks('[a](b:)'.repeat(20_000), PAGE_URL),
    ];
    const elapsedMs = performance.now() - startedAt;

    expect(links).toEqual([]);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
