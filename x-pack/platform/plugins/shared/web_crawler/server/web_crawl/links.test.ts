/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractLinks,
  getSiteKey,
  getUrlFields,
  isSameSitePage,
  iterateLinkTargets,
  normalizeUrl,
} from './links';

const PAGE_URL = 'https://example.com/docs/guide/intro';
const SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

describe('normalizeUrl', () => {
  it('returns absolute http and https URLs', () => {
    expect(normalizeUrl('http://example.com/a')).toBe('http://example.com/a');
    expect(normalizeUrl('https://example.com/a?b=c')).toBe('https://example.com/a?b=c');
  });

  it('adds the root path to a bare origin', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it.each([
    'ftp://example.com/file',
    'file:///etc/passwd',
    SCRIPT_URL,
    'mailto:someone@example.com',
    'data:text/html,hello',
    'tel:+123456789',
  ])('rejects the non-http(s) URL %s', (url) => {
    expect(normalizeUrl(url)).toBeNull();
    expect(normalizeUrl(url, PAGE_URL)).toBeNull();
  });

  it.each(['', 'not a url', '/relative/path', 'example.com'])(
    'rejects %p when there is no base URL to resolve it against',
    (url) => {
      expect(normalizeUrl(url)).toBeNull();
    }
  );

  it('strips the fragment', () => {
    expect(normalizeUrl('https://example.com/a?b=c#section')).toBe('https://example.com/a?b=c');
  });

  it('strips credentials', () => {
    expect(normalizeUrl('https://user:secret@example.com/a')).toBe('https://example.com/a');
    expect(normalizeUrl('https://user@example.com/a')).toBe('https://example.com/a');
  });

  it('resolves relative URLs against the base URL', () => {
    expect(normalizeUrl('/root', PAGE_URL)).toBe('https://example.com/root');
    expect(normalizeUrl('sibling', PAGE_URL)).toBe('https://example.com/docs/guide/sibling');
    expect(normalizeUrl('../up', PAGE_URL)).toBe('https://example.com/docs/up');
    expect(normalizeUrl('?page=2', PAGE_URL)).toBe('https://example.com/docs/guide/intro?page=2');
    expect(normalizeUrl('//other.example.org/x', PAGE_URL)).toBe('https://other.example.org/x');
    expect(normalizeUrl('#top', PAGE_URL)).toBe(PAGE_URL);
  });

  it('rejects URLs longer than 2048 characters', () => {
    const prefix = 'https://example.com/';
    expect(normalizeUrl(`${prefix}${'a'.repeat(2048 - prefix.length)}`)).toHaveLength(2048);
    expect(normalizeUrl(`${prefix}${'a'.repeat(2049 - prefix.length)}`)).toBeNull();
  });

  it('rejects relative URLs that resolve to more than 2048 characters', () => {
    expect(normalizeUrl('a'.repeat(2040), PAGE_URL)).toBeNull();
  });

  describe('URL traps', () => {
    const toPath = (segmentCount: number): string =>
      Array.from({ length: segmentCount }, (_, segment) => `/s${segment}`).join('');

    const toQuery = (paramCount: number): string =>
      Array.from({ length: paramCount }, (_, param) => `p${param}=${param}`).join('&');

    it('accepts a path of 16 segments and rejects one of 17', () => {
      expect(normalizeUrl(`https://example.com${toPath(16)}`)).toBe(
        `https://example.com${toPath(16)}`
      );
      expect(normalizeUrl(`https://example.com${toPath(17)}`)).toBeNull();
    });

    it('does not count a trailing slash or empty segments as path segments', () => {
      expect(normalizeUrl(`https://example.com${toPath(16)}/`)).toBe(
        `https://example.com${toPath(16)}/`
      );
      expect(normalizeUrl(`https://example.com//${toPath(16)}//`)).toBe(
        `https://example.com//${toPath(16)}//`
      );
    });

    it('counts the path segments after resolving a relative URL', () => {
      const baseUrl = `https://example.com${toPath(15)}/page`;

      expect(normalizeUrl('sibling', baseUrl)).toBe(`https://example.com${toPath(15)}/sibling`);
      expect(normalizeUrl('child/page', baseUrl)).toBeNull();
      expect(normalizeUrl('../../child/page', baseUrl)).toBe(
        `https://example.com${toPath(13)}/child/page`
      );
    });

    it('accepts 10 query parameters and rejects 11', () => {
      expect(normalizeUrl(`https://example.com/a?${toQuery(10)}`)).toBe(
        `https://example.com/a?${toQuery(10)}`
      );
      expect(normalizeUrl(`https://example.com/a?${toQuery(11)}`)).toBeNull();
    });

    it('counts every occurrence of a repeated query parameter, and those without a value', () => {
      const repeated = (count: number): string =>
        Array.from({ length: count }, () => 'tag=a').join('&');
      const bare = (count: number): string =>
        Array.from({ length: count }, (_, param) => `flag${param}`).join('&');

      expect(normalizeUrl(`https://example.com/a?${repeated(10)}`)).not.toBeNull();
      expect(normalizeUrl(`https://example.com/a?${repeated(11)}`)).toBeNull();
      expect(normalizeUrl(`https://example.com/a?${bare(10)}`)).not.toBeNull();
      expect(normalizeUrl(`https://example.com/a?${bare(11)}`)).toBeNull();
    });

    it('accepts a URL that is at both limits', () => {
      const url = `https://example.com${toPath(16)}?${toQuery(10)}`;

      expect(normalizeUrl(url)).toBe(url);
    });

    it('does not count what is in the fragment', () => {
      expect(normalizeUrl(`https://example.com/a#${toPath(17)}?${toQuery(11)}`)).toBe(
        'https://example.com/a'
      );
    });
  });
});

describe('getUrlFields', () => {
  it('returns the host, the path and the first three directories', () => {
    expect(getUrlFields('https://example.com/docs/guide/intro/install')).toEqual({
      url_host: 'example.com',
      url_path: '/docs/guide/intro/install',
      url_path_dir1: 'docs',
      url_path_dir2: 'guide',
      url_path_dir3: 'intro',
    });
  });

  it.each([
    ['https://example.com/', '/', undefined, undefined, undefined],
    ['https://example.com/docs', '/docs', 'docs', undefined, undefined],
    ['https://example.com/docs/', '/docs/', 'docs', undefined, undefined],
    ['https://example.com/docs/guide', '/docs/guide', 'docs', 'guide', undefined],
    ['https://example.com/docs/guide/intro', '/docs/guide/intro', 'docs', 'guide', 'intro'],
    ['https://example.com//docs//guide', '//docs//guide', 'docs', 'guide', undefined],
  ])('splits %s', (url, path, dir1, dir2, dir3) => {
    expect(getUrlFields(url)).toEqual({
      url_host: 'example.com',
      url_path: path,
      url_path_dir1: dir1,
      url_path_dir2: dir2,
      url_path_dir3: dir3,
    });
  });

  it('leaves the directories that the path does not have undefined', () => {
    const fields = getUrlFields('https://example.com/docs');

    expect(fields.url_path_dir2).toBeUndefined();
    expect(fields.url_path_dir3).toBeUndefined();
    expect(JSON.parse(JSON.stringify(fields))).toEqual({
      url_host: 'example.com',
      url_path: '/docs',
      url_path_dir1: 'docs',
    });
  });

  it('keeps the query and the fragment out of the path', () => {
    expect(getUrlFields('https://example.com/docs/guide?tab=1#top')).toEqual(
      expect.objectContaining({ url_path: '/docs/guide', url_path_dir2: 'guide' })
    );
  });

  it('keeps the www. prefix and other subdomains, and drops the port', () => {
    expect(getUrlFields('https://www.example.com/').url_host).toBe('www.example.com');
    expect(getUrlFields('https://docs.example.com:8443/').url_host).toBe('docs.example.com');
  });

  it('lowercases the host and keeps the path as the URL has it', () => {
    expect(getUrlFields('https://EXAMPLE.com/Docs/caf%C3%A9')).toEqual(
      expect.objectContaining({
        url_host: 'example.com',
        url_path: '/Docs/caf%C3%A9',
        url_path_dir1: 'Docs',
        url_path_dir2: 'caf%C3%A9',
      })
    );
  });
});

describe('getSiteKey', () => {
  it('returns the hostname without port, path or protocol', () => {
    expect(getSiteKey('https://example.com:8443/a/b?c=d')).toBe('example.com');
  });

  it('treats the www. host as the bare host', () => {
    expect(getSiteKey('https://www.example.com/')).toBe(getSiteKey('http://example.com/'));
  });

  it('keeps other subdomains apart', () => {
    expect(getSiteKey('https://docs.example.com/')).toBe('docs.example.com');
    expect(getSiteKey('https://wwwexample.com/')).toBe('wwwexample.com');
  });
});

describe('extractLinks', () => {
  it('returns an empty list when the page has no links', () => {
    expect(extractLinks('', PAGE_URL)).toEqual([]);
    expect(
      extractLinks('# Title\n\nJust some text (with parentheses) and [brackets].', PAGE_URL)
    ).toEqual([]);
  });

  it('extracts absolute and relative links', () => {
    const markdown = [
      'See [absolute](https://example.com/absolute), [root](/root),',
      '[sibling](sibling) and [parent](../parent).',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      'https://example.com/absolute',
      'https://example.com/root',
      'https://example.com/docs/guide/sibling',
      'https://example.com/docs/parent',
    ]);
  });

  it('extracts the target of image links and of links wrapping an image', () => {
    const markdown = '[![logo](/logo.png)](/home) and ![diagram](/diagrams/overview)';

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      'https://example.com/home',
      'https://example.com/diagrams/overview',
    ]);
  });

  it('only keeps links to the same site', () => {
    const markdown = [
      '[same](https://example.com/same)',
      '[other](https://other.org/page)',
      '[subdomain](https://docs.example.com/page)',
      '[lookalike](https://example.com.evil.org/page)',
      '[protocol relative](//cdn.example.net/page)',
    ].join(' ');

    expect(extractLinks(markdown, PAGE_URL)).toEqual(['https://example.com/same']);
  });

  it('treats www. and the bare host as the same site in both directions', () => {
    expect(extractLinks('[a](https://www.example.com/a)', PAGE_URL)).toEqual([
      'https://www.example.com/a',
    ]);
    expect(extractLinks('[a](https://example.com/a)', 'https://www.example.com/')).toEqual([
      'https://example.com/a',
    ]);
  });

  it('keeps same-site links on another protocol or port', () => {
    expect(
      extractLinks('[a](http://example.com/a) [b](https://example.com:8443/b)', PAGE_URL)
    ).toEqual(['http://example.com/a', 'https://example.com:8443/b']);
  });

  it('skips non-http(s) links', () => {
    const markdown =
      '[mail](mailto:someone@example.com) [js](javascript:void(0)) [ftp](ftp://example.com/a) [tel](tel:123)';

    expect(extractLinks(markdown, PAGE_URL)).toEqual([]);
  });

  it('skips links to binary and asset files whatever the extension case', () => {
    const markdown = [
      '[pdf](/files/report.pdf)',
      '[upper](/files/REPORT.PDF)',
      '[image](/img/photo.jpeg?size=large)',
      '[archive](/downloads/release.tar.gz)',
      '[style](/assets/site.css#top)',
      '[feed](/feed.xml)',
      '[page](/files/report)',
      '[html](/files/report.html)',
      '[versioned](/docs/v1.2/)',
      '[dotted directory](/releases/v2.zip/notes)',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      'https://example.com/files/report',
      'https://example.com/files/report.html',
      'https://example.com/docs/v1.2/',
      'https://example.com/releases/v2.zip/notes',
    ]);
  });

  it('dedupes links, including ones that only differ by fragment or credentials', () => {
    const markdown = [
      '[one](/page)',
      '[two](/page)',
      '[three](/page#section)',
      '[four](https://example.com/page)',
      '[five](https://user:secret@example.com/page)',
      '[six](/page?query=1)',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      'https://example.com/page',
      'https://example.com/page?query=1',
    ]);
  });

  it('strips credentials and fragments from the returned links', () => {
    expect(extractLinks('[a](https://user:secret@example.com/a#b)', PAGE_URL)).toEqual([
      'https://example.com/a',
    ]);
  });

  it('ignores the title of a `[text](url "title")` link', () => {
    const markdown = [
      '[double](/double "A title")',
      "[single](/single 'A title')",
      '[tab](/tab\t"A title")',
      '[newline](/newline\n"A title")',
    ].join(' ');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([
      'https://example.com/double',
      'https://example.com/single',
      'https://example.com/tab',
      'https://example.com/newline',
    ]);
  });

  it('ignores an unterminated link target at the end of the document', () => {
    expect(extractLinks('[ok](/ok) and [broken](/broken', PAGE_URL)).toEqual([
      'https://example.com/ok',
    ]);
    expect(extractLinks('trailing ](', PAGE_URL)).toEqual([]);
  });

  it('skips empty link targets', () => {
    const markdown = [
      '[empty]()',
      '[space]( /after-space)',
      '[newline](\n/after-newline)',
      'dangling ](',
      '](\t',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual([]);
    expect(extractLinks('[empty]() then [fine](/fine)', PAGE_URL)).toEqual([
      'https://example.com/fine',
    ]);
  });

  it('ignores link targets that are not valid URLs', () => {
    const markdown = [
      '[bad host](https://exa mple.com/a)',
      '[bad url](http://[not-an-ip]/a)',
      '[bad port](https://example.com:port/a)',
      '[fine](/fine)',
    ].join('\n');

    expect(extractLinks(markdown, PAGE_URL)).toEqual(['https://example.com/fine']);
  });

  it('ignores a link target longer than a URL can be and keeps scanning after it', () => {
    const markdown = `[long](/${'a'.repeat(3000)}) then [next](/next)`;

    expect(extractLinks(markdown, PAGE_URL)).toEqual(['https://example.com/next']);
  });

  it('skips links with more path segments or query parameters than a page URL may have', () => {
    const deepPath = Array.from({ length: 17 }, (_, segment) => `/s${segment}`).join('');
    const longQuery = Array.from({ length: 11 }, (_, param) => `p${param}=1`).join('&');
    const markdown = `[deep](${deepPath}) [calendar](/events?${longQuery}) [fine](/events?month=5)`;

    expect(extractLinks(markdown, PAGE_URL)).toEqual(['https://example.com/events?month=5']);
  });

  it('returns at most 2000 links per page', () => {
    const markdown = Array.from({ length: 2500 }, (_, i) => `[page ${i}](/page-${i})`).join('\n');

    const links = extractLinks(markdown, PAGE_URL);

    expect(links).toHaveLength(2000);
    expect(links[0]).toBe('https://example.com/page-0');
    expect(links[1999]).toBe('https://example.com/page-1999');
  });

  it('stays fast on a pathological document of repeated `](`', () => {
    const markdown = ']('.repeat(512 * 1024);
    expect(markdown).toHaveLength(1024 * 1024);

    const startedAt = performance.now();
    const links = extractLinks(markdown, PAGE_URL);
    const elapsedMs = performance.now() - startedAt;

    expect(links).toEqual([]);
    expect(elapsedMs).toBeLessThan(2000);
  });

  it('stays fast on a pathological document of repeated short unresolvable links', () => {
    const markdown = '[a](b:)'.repeat(20_000);

    const startedAt = performance.now();
    const links = extractLinks(markdown, PAGE_URL);
    const elapsedMs = performance.now() - startedAt;

    expect(links).toEqual([]);
    expect(elapsedMs).toBeLessThan(2000);
  });
});

describe('iterateLinkTargets', () => {
  it('yields nothing for a document without links', () => {
    expect([...iterateLinkTargets('')]).toEqual([]);
    expect([...iterateLinkTargets('# Title\n\nText (with parentheses) and [brackets].')]).toEqual(
      []
    );
  });

  it('yields the raw target of every link, in document order', () => {
    const markdown = [
      '[absolute](https://example.com/a#section)',
      '[relative](../b?c=d)',
      '[other site](https://other.org/page)',
      '[mail](mailto:someone@example.com)',
      '![image](/logo.png)',
      '[repeated](/a) and [repeated](/a)',
    ].join('\n');

    expect([...iterateLinkTargets(markdown)]).toEqual([
      'https://example.com/a#section',
      '../b?c=d',
      'https://other.org/page',
      'mailto:someone@example.com',
      '/logo.png',
      '/a',
      '/a',
    ]);
  });

  it('ends a target at the title of a `[text](url "title")` link', () => {
    expect([...iterateLinkTargets('[a](/a "Title") [b](/b\t\'Title\') [c](/c\n"Title")')]).toEqual([
      '/a',
      '/b',
      '/c',
    ]);
  });

  it('yields the targets of a sitemap converted to markdown', () => {
    const markdown =
      '[https://example.com/a](https://example.com/a)  \n2024-12-05\n\n[https://example.com/b](https://example.com/b)  \n2024-12-06';

    expect([...iterateLinkTargets(markdown)]).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });

  it('skips empty, unterminated and overlong targets', () => {
    const markdown = [
      '[empty]()',
      '[space]( /after-space)',
      `[long](/${'a'.repeat(3000)})`,
      '[fine](/fine)',
      '[unterminated](/unterminated',
    ].join('\n');

    expect([...iterateLinkTargets(markdown)]).toEqual(['/fine']);
  });

  it('accepts a target of 2047 characters and skips one of 2048', () => {
    const accepted = `/${'a'.repeat(2046)}`;
    const skipped = `/${'a'.repeat(2047)}`;

    expect([...iterateLinkTargets(`[a](${accepted})`)]).toEqual([accepted]);
    expect([...iterateLinkTargets(`[a](${skipped})`)]).toEqual([]);
  });

  it('is lazy, so a consumer can stop early', () => {
    const markdown = '[link](/page) '.repeat(100_000);
    const targets: string[] = [];

    const startedAt = performance.now();
    for (const target of iterateLinkTargets(markdown)) {
      targets.push(target);
      if (targets.length === 3) {
        break;
      }
    }
    const elapsedMs = performance.now() - startedAt;

    expect(targets).toEqual(['/page', '/page', '/page']);
    expect(elapsedMs).toBeLessThan(100);
  });

  it('stays fast on a pathological document of repeated `](`', () => {
    const markdown = ']('.repeat(512 * 1024);

    const startedAt = performance.now();
    const targets = [...iterateLinkTargets(markdown)];
    const elapsedMs = performance.now() - startedAt;

    expect(targets).toEqual([]);
    expect(elapsedMs).toBeLessThan(2000);
  });
});

describe('isSameSitePage', () => {
  const SITE_KEY = 'example.com';

  it.each([
    'https://example.com/',
    'https://example.com/docs/page',
    'http://example.com/docs/page',
    'https://www.example.com/docs/page',
    'https://example.com:8443/docs/page?query=1',
    'https://example.com/page.html',
    'https://example.com/docs/v1.2/',
    'https://example.com/releases/v2.zip/notes',
  ])('accepts the page %s', (url) => {
    expect(isSameSitePage(url, SITE_KEY)).toBe(true);
  });

  it.each([
    'https://other.org/',
    'https://docs.example.com/page',
    'https://example.com.evil.org/page',
    'https://notexample.com/page',
  ])('rejects %s, which is on another site', (url) => {
    expect(isSameSitePage(url, SITE_KEY)).toBe(false);
  });

  it.each([
    'https://example.com/report.pdf',
    'https://example.com/photo.JPG',
    'https://example.com/archive.tar.gz',
    'https://example.com/sitemap.xml',
    'https://example.com/app.js?v=3',
  ])('rejects %s, which is not a page', (url) => {
    expect(isSameSitePage(url, SITE_KEY)).toBe(false);
  });

  it('compares against the given site key', () => {
    expect(isSameSitePage('https://docs.example.com/page', 'docs.example.com')).toBe(true);
    expect(isSameSitePage('https://www.example.com/page', getSiteKey('https://example.com/'))).toBe(
      true
    );
    expect(isSameSitePage('https://example.com/page', 'www.example.com')).toBe(false);
  });
});

describe('normalizeUrl for a URL the user asked for', () => {
  const deepUrl = `https://example.com/${Array.from({ length: 17 }, (_, i) => `s${i}`).join('/')}`;
  const manyParamsUrl = `https://example.com/?${Array.from(
    { length: 11 },
    (_, i) => `p${i}=1`
  ).join('&')}`;

  it.each([deepUrl, manyParamsUrl])('keeps %s, which a crawl would not follow as a link', (url) => {
    expect(normalizeUrl(url)).toBeNull();
    expect(normalizeUrl(url, undefined, { isDiscovered: false })).toBe(url);
  });

  it('still refuses a URL that is not crawlable at all', () => {
    expect(normalizeUrl('ftp://example.com/', undefined, { isDiscovered: false })).toBeNull();
    expect(
      normalizeUrl(`https://example.com/${'a'.repeat(2048)}`, undefined, { isDiscovered: false })
    ).toBeNull();
  });
});
