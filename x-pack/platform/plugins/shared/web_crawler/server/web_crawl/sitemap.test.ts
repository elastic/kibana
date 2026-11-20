/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SITEMAP_REQUESTS, discoverSitemapPages, parseSitemap } from './sitemap';

const ORIGIN = 'https://example.com';
const SITE_URL = `${ORIGIN}/docs/start`;
const SITE_KEY = 'example.com';
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;

const toUrlSet = (locations: string[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map(
      (location) =>
        `  <url>\n    <loc>${location}</loc>\n    <lastmod>2024-12-05</lastmod>\n    <priority>0.8</priority>\n  </url>`
    ),
    '</urlset>',
  ].join('\n');

const toSitemapIndex = (locations: string[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map(
      (location) => `  <sitemap><loc>${location}</loc><lastmod>2024-12-05</lastmod></sitemap>`
    ),
    '</sitemapindex>',
  ].join('\n');

const toMarkdown = (locations: string[]): string =>
  locations.map((location) => `[${location}](${location})  \n2024-12-05`).join('\n\n');

const toPages = (count: number, prefix: string = 'page'): string[] =>
  Array.from({ length: count }, (_, index) => `${ORIGIN}/${prefix}-${index}`);

describe('parseSitemap', () => {
  it('skips empty loc entries instead of resolving them to the sitemap itself', () => {
    expect(
      parseSitemap(
        '<urlset><url><loc></loc></url><url><loc><![CDATA[]]></loc></url><url><loc>https://example.com/a</loc></url></urlset>',
        'https://example.com/sitemap.xml',
        'example.com',
        10
      )
    ).toEqual({ pageUrls: ['https://example.com/a'], sitemapUrls: [] });
  });

  const parse = (content: string, maxPages: number = 100) =>
    parseSitemap(content, SITEMAP_URL, SITE_KEY, maxPages);

  it('reads the `<loc>` entries of an XML sitemap', () => {
    const content = toUrlSet([`${ORIGIN}/`, `${ORIGIN}/docs/a`, `${ORIGIN}/docs/b?page=2`]);

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/`, `${ORIGIN}/docs/a`, `${ORIGIN}/docs/b?page=2`],
      sitemapUrls: [],
    });
  });

  it('reads `<loc>` entries on a single line and with surrounding whitespace', () => {
    const content = `<urlset><url><loc>${ORIGIN}/a</loc></url><url><loc>\n   ${ORIGIN}/b\n  </loc></url></urlset>`;

    expect(parse(content).pageUrls).toEqual([`${ORIGIN}/a`, `${ORIGIN}/b`]);
  });

  it('reads the entries of a sitemap that was converted to markdown links', () => {
    const content = toMarkdown([`${ORIGIN}/`, `${ORIGIN}/docs/a`, `${ORIGIN}/docs/b`]);
    expect(content).toContain(`[${ORIGIN}/docs/a](${ORIGIN}/docs/a)  \n2024-12-05`);

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/`, `${ORIGIN}/docs/a`, `${ORIGIN}/docs/b`],
      sitemapUrls: [],
    });
  });

  it('reads plain-text content without any entry as empty', () => {
    expect(parse('')).toEqual({ pageUrls: [], sitemapUrls: [] });
    expect(parse('# 404\n\nPage not found')).toEqual({ pageUrls: [], sitemapUrls: [] });
    expect(parse(`${ORIGIN}/a\n${ORIGIN}/b`)).toEqual({ pageUrls: [], sitemapUrls: [] });
  });

  it('ignores an unterminated `<loc>` entry', () => {
    const content = `<urlset><url><loc>${ORIGIN}/a</loc></url><url><loc>${ORIGIN}/b`;

    expect(parse(content).pageUrls).toEqual([`${ORIGIN}/a`]);
  });

  it('resolves relative entries against the sitemap URL', () => {
    expect(parse(toUrlSet(['/docs/a', 'b'])).pageUrls).toEqual([`${ORIGIN}/docs/a`, `${ORIGIN}/b`]);
  });

  it('decodes the XML entities of a `<loc>` entry', () => {
    const content = toUrlSet([
      `${ORIGIN}/search?q=a&amp;page=2&amp;sort=asc`,
      `${ORIGIN}/quote?text=&quot;hi&quot;&amp;author=o&apos;neil`,
      `${ORIGIN}/compare?range=&lt;10&gt;`,
    ]);

    expect(parse(content).pageUrls).toEqual([
      `${ORIGIN}/search?q=a&page=2&sort=asc`,
      `${ORIGIN}/quote?text=%22hi%22&author=o%27neil`,
      `${ORIGIN}/compare?range=%3C10%3E`,
    ]);
  });

  it('decodes a doubly escaped entity only once', () => {
    const content = toUrlSet([
      `${ORIGIN}/a?b=1&amp;amp;c=2`,
      `${ORIGIN}/b?text=&amp;lt;tag&amp;gt;`,
      `${ORIGIN}/c?text=&amp;quot;`,
    ]);

    expect(parse(content).pageUrls).toEqual([
      `${ORIGIN}/a?b=1&amp;c=2`,
      `${ORIGIN}/b?text=&lt;tag&gt;`,
      `${ORIGIN}/c?text=&quot;`,
    ]);
  });

  it('treats an entity-encoded and a plain entry for the same URL as one page', () => {
    const content = [
      toUrlSet([`${ORIGIN}/a?b=1&amp;c=2`]),
      toMarkdown([`${ORIGIN}/a?b=1&c=2`]),
    ].join('\n');

    expect(parse(content).pageUrls).toEqual([`${ORIGIN}/a?b=1&c=2`]);
  });

  it('unwraps a CDATA `<loc>` entry without decoding entities inside it', () => {
    const content = [
      `<urlset><url><loc><![CDATA[${ORIGIN}/a?b=1&c=2]]></loc></url>`,
      `<url><loc>\n  <![CDATA[ ${ORIGIN}/spaced ]]>\n</loc></url>`,
      `<url><loc><![CDATA[${ORIGIN}/literal?b=1&amp;c=2]]></loc></url>`,
      `<sitemap><loc><![CDATA[${ORIGIN}/nested.xml]]></loc></sitemap></urlset>`,
    ].join('\n');

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/a?b=1&c=2`, `${ORIGIN}/spaced`, `${ORIGIN}/literal?b=1&amp;c=2`],
      sitemapUrls: [`${ORIGIN}/nested.xml`],
    });
  });

  it('strips fragments and credentials from the entries', () => {
    expect(parse(toUrlSet(['https://user:secret@example.com/a#section'])).pageUrls).toEqual([
      `${ORIGIN}/a`,
    ]);
  });

  it('only keeps the pages of the same site', () => {
    const content = toUrlSet([
      `${ORIGIN}/same`,
      'https://www.example.com/www',
      'http://example.com/http',
      'https://other.org/page',
      'https://docs.example.com/page',
      'https://example.com.evil.org/page',
      'ftp://example.com/file',
      'not a url at all',
    ]);

    expect(parse(content).pageUrls).toEqual([
      `${ORIGIN}/same`,
      'https://www.example.com/www',
      'http://example.com/http',
      `${ORIGIN}/not%20a%20url%20at%20all`,
    ]);
  });

  it('filters by the given site key rather than the sitemap host', () => {
    const content = toUrlSet([`${ORIGIN}/a`, 'https://cdn.example.net/b']);

    expect(
      parseSitemap(content, 'https://cdn.example.net/sitemap.xml', SITE_KEY, 10).pageUrls
    ).toEqual([`${ORIGIN}/a`]);
  });

  describe('with several site keys', () => {
    const MIXED_SITES = toUrlSet([
      `${ORIGIN}/a`,
      'https://docs.example.org/b',
      'https://www.docs.example.org/c',
      'https://other.net/d',
      'https://blog.example.com/e',
      `${ORIGIN}/f`,
    ]);

    it('keeps the pages of every given site, in the order they are listed', () => {
      expect(
        parseSitemap(MIXED_SITES, SITEMAP_URL, [SITE_KEY, 'docs.example.org'], 100).pageUrls
      ).toEqual([
        `${ORIGIN}/a`,
        'https://docs.example.org/b',
        'https://www.docs.example.org/c',
        `${ORIGIN}/f`,
      ]);
    });

    it('does not depend on the order of the site keys', () => {
      expect(
        parseSitemap(MIXED_SITES, SITEMAP_URL, ['docs.example.org', SITE_KEY], 100).pageUrls
      ).toEqual(
        parseSitemap(MIXED_SITES, SITEMAP_URL, [SITE_KEY, 'docs.example.org'], 100).pageUrls
      );
    });

    it('reads an array with one site key like that site key on its own', () => {
      expect(parseSitemap(MIXED_SITES, SITEMAP_URL, [SITE_KEY], 100)).toEqual(
        parseSitemap(MIXED_SITES, SITEMAP_URL, SITE_KEY, 100)
      );
      expect(parseSitemap(MIXED_SITES, SITEMAP_URL, [SITE_KEY], 100).pageUrls).toEqual([
        `${ORIGIN}/a`,
        `${ORIGIN}/f`,
      ]);
    });

    it('keeps no page, and still the nested sitemaps, when there is no site key', () => {
      const content = [MIXED_SITES, toSitemapIndex([`${ORIGIN}/nested.xml`])].join('\n');

      expect(parseSitemap(content, SITEMAP_URL, [], 100)).toEqual({
        pageUrls: [],
        sitemapUrls: [`${ORIGIN}/nested.xml`],
      });
    });

    it('does not keep the pages of a site that only resembles one of the given sites', () => {
      const content = toUrlSet([
        'https://example.com.evil.org/a',
        'https://docs.example.org.evil.net/b',
        'https://notexample.com/c',
        'https://sub.docs.example.org/d',
      ]);

      expect(
        parseSitemap(content, SITEMAP_URL, [SITE_KEY, 'docs.example.org'], 100).pageUrls
      ).toEqual([]);
    });

    it('skips binary and asset entries on every site', () => {
      const content = toUrlSet([
        `${ORIGIN}/file.pdf`,
        'https://docs.example.org/logo.png',
        'https://docs.example.org/page',
      ]);

      expect(
        parseSitemap(content, SITEMAP_URL, [SITE_KEY, 'docs.example.org'], 100).pageUrls
      ).toEqual(['https://docs.example.org/page']);
    });

    it('applies the page cap across the sites', () => {
      expect(
        parseSitemap(MIXED_SITES, SITEMAP_URL, [SITE_KEY, 'docs.example.org'], 2).pageUrls
      ).toEqual([`${ORIGIN}/a`, 'https://docs.example.org/b']);
    });

    it('returns the nested sitemaps of any host, whatever the site keys', () => {
      const content = toSitemapIndex([
        `${ORIGIN}/a.xml`,
        'https://docs.example.org/b.xml',
        'https://cdn.example.net/c.xml',
      ]);

      expect(parseSitemap(content, SITEMAP_URL, [SITE_KEY, 'docs.example.org'], 100)).toEqual({
        pageUrls: [],
        sitemapUrls: [
          `${ORIGIN}/a.xml`,
          'https://docs.example.org/b.xml',
          'https://cdn.example.net/c.xml',
        ],
      });
    });
  });

  it('skips entries with a binary or asset extension', () => {
    const content = toUrlSet([
      `${ORIGIN}/files/report.pdf`,
      `${ORIGIN}/images/photo.JPG`,
      `${ORIGIN}/downloads/archive.zip`,
      `${ORIGIN}/page.html`,
      `${ORIGIN}/docs/v1.2/`,
    ]);

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/page.html`, `${ORIGIN}/docs/v1.2/`],
      sitemapUrls: [],
    });
  });

  it('returns nested `.xml` sitemaps separately from the pages', () => {
    const content = toSitemapIndex([
      `${ORIGIN}/sitemaps/docs.xml`,
      `${ORIGIN}/sitemaps/BLOG.XML`,
      `${ORIGIN}/sitemaps/products.xml?page=2`,
    ]);

    expect(parse(content)).toEqual({
      pageUrls: [],
      sitemapUrls: [
        `${ORIGIN}/sitemaps/docs.xml`,
        `${ORIGIN}/sitemaps/BLOG.XML`,
        `${ORIGIN}/sitemaps/products.xml?page=2`,
      ],
    });
  });

  it('separates pages and nested sitemaps listed together', () => {
    const content = toMarkdown([`${ORIGIN}/a`, `${ORIGIN}/nested.xml`, `${ORIGIN}/b`]);

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/a`, `${ORIGIN}/b`],
      sitemapUrls: [`${ORIGIN}/nested.xml`],
    });
  });

  it('dedupes pages and nested sitemaps', () => {
    const content = [
      toUrlSet([`${ORIGIN}/a`, `${ORIGIN}/a`, `${ORIGIN}/a#fragment`, `${ORIGIN}/nested.xml`]),
      toMarkdown([`${ORIGIN}/a`, `${ORIGIN}/b`, `${ORIGIN}/nested.xml`]),
    ].join('\n');

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/a`, `${ORIGIN}/b`],
      sitemapUrls: [`${ORIGIN}/nested.xml`],
    });
  });

  it.each([0, 1, 3, 10])('returns at most %i pages', (maxPages) => {
    const pages = toPages(10);

    expect(parse(toUrlSet(pages), maxPages).pageUrls).toEqual(pages.slice(0, maxPages));
    expect(parse(toMarkdown(pages), maxPages).pageUrls).toEqual(pages.slice(0, maxPages));
  });

  it('does not count duplicates or skipped entries towards the page cap', () => {
    const content = toUrlSet([
      `${ORIGIN}/a`,
      `${ORIGIN}/a`,
      'https://other.org/x',
      `${ORIGIN}/file.pdf`,
      `${ORIGIN}/b`,
      `${ORIGIN}/c`,
    ]);

    expect(parse(content, 2).pageUrls).toEqual([`${ORIGIN}/a`, `${ORIGIN}/b`]);
  });

  it('stays fast on a very large sitemap', () => {
    const content = toUrlSet(toPages(50_000));

    const startedAt = performance.now();
    const { pageUrls } = parse(content, 1000);
    const elapsedMs = performance.now() - startedAt;

    expect(pageUrls).toHaveLength(1000);
    expect(elapsedMs).toBeLessThan(2000);
  });

  it('stays fast on a pathological document of repeated `<loc>`', () => {
    const content = '<loc>'.repeat(200_000);

    const startedAt = performance.now();
    const entries = parse(content);
    const elapsedMs = performance.now() - startedAt;

    expect(entries).toEqual({ pageUrls: [], sitemapUrls: [] });
    expect(elapsedMs).toBeLessThan(2000);
  });
});

describe('discoverSitemapPages', () => {
  let abortController: AbortController;
  let fetchContent: jest.Mock<Promise<string | undefined>, [string]>;

  const mockSitemaps = (sitemaps: Record<string, string | undefined>) => {
    fetchContent.mockImplementation(async (url) => sitemaps[url]);
  };

  const discover = ({
    declaredSitemaps = [],
    maxPages = 100,
    siteKeys,
    maxRequests,
  }: {
    declaredSitemaps?: string[];
    maxPages?: number;
    siteKeys?: string[];
    maxRequests?: number;
  } = {}) =>
    discoverSitemapPages({
      siteUrl: SITE_URL,
      declaredSitemaps,
      maxPages,
      siteKeys,
      maxRequests,
      signal: abortController.signal,
      fetchContent,
    });

  const getFetchedUrls = (): string[] => fetchContent.mock.calls.map(([url]) => url);

  beforeEach(() => {
    abortController = new AbortController();
    fetchContent = jest.fn();
    mockSitemaps({});
  });

  it('falls back to /sitemap.xml at the site root when no sitemap is declared', async () => {
    mockSitemaps({ [SITEMAP_URL]: toUrlSet(toPages(3)) });

    await expect(discover()).resolves.toEqual(toPages(3));
    expect(getFetchedUrls()).toEqual([SITEMAP_URL]);
  });

  it('uses the declared sitemaps instead of /sitemap.xml', async () => {
    mockSitemaps({
      [SITEMAP_URL]: toUrlSet(toPages(3, 'default')),
      [`${ORIGIN}/sitemaps/docs.xml`]: toUrlSet(toPages(2, 'docs')),
      [`${ORIGIN}/sitemaps/blog.xml`]: toMarkdown(toPages(2, 'blog')),
    });

    await expect(
      discover({
        declaredSitemaps: [`${ORIGIN}/sitemaps/docs.xml`, `${ORIGIN}/sitemaps/blog.xml`],
      })
    ).resolves.toEqual([...toPages(2, 'docs'), ...toPages(2, 'blog')]);
    expect(getFetchedUrls()).toEqual([
      `${ORIGIN}/sitemaps/docs.xml`,
      `${ORIGIN}/sitemaps/blog.xml`,
    ]);
  });

  it('resolves relative declared sitemaps against the site URL', async () => {
    mockSitemaps({ [`${ORIGIN}/sitemaps/main.xml`]: toUrlSet(toPages(1)) });

    await expect(discover({ declaredSitemaps: ['/sitemaps/main.xml'] })).resolves.toEqual(
      toPages(1)
    );
    expect(getFetchedUrls()).toEqual([`${ORIGIN}/sitemaps/main.xml`]);
  });

  it('falls back to /sitemap.xml when no declared sitemap is a valid URL', async () => {
    mockSitemaps({ [SITEMAP_URL]: toUrlSet(toPages(1)) });

    await expect(
      discover({ declaredSitemaps: ['ftp://example.com/sitemap.xml', 'http://[bad]/sitemap.xml'] })
    ).resolves.toEqual(toPages(1));
    expect(getFetchedUrls()).toEqual([SITEMAP_URL]);
  });

  it('follows a sitemap index', async () => {
    mockSitemaps({
      [SITEMAP_URL]: toSitemapIndex([`${ORIGIN}/sitemap-a.xml`, `${ORIGIN}/sitemap-b.xml`]),
      [`${ORIGIN}/sitemap-a.xml`]: toUrlSet(toPages(2, 'a')),
      [`${ORIGIN}/sitemap-b.xml`]: toUrlSet(toPages(2, 'b')),
    });

    await expect(discover()).resolves.toEqual([...toPages(2, 'a'), ...toPages(2, 'b')]);
    expect(getFetchedUrls()).toEqual([
      SITEMAP_URL,
      `${ORIGIN}/sitemap-a.xml`,
      `${ORIGIN}/sitemap-b.xml`,
    ]);
  });

  it('never fetches more than 3 sitemaps from a sitemap index', async () => {
    const nested = Array.from({ length: 8 }, (_, index) => `${ORIGIN}/sitemap-${index}.xml`);
    fetchContent.mockImplementation(async (url) =>
      url === SITEMAP_URL ? toSitemapIndex(nested) : toUrlSet([`${url.replace('.xml', '')}/page`])
    );

    await expect(discover()).resolves.toEqual([
      `${ORIGIN}/sitemap-0/page`,
      `${ORIGIN}/sitemap-1/page`,
    ]);
    expect(getFetchedUrls()).toEqual([SITEMAP_URL, nested[0], nested[1]]);
  });

  it('never fetches more than 3 declared sitemaps', async () => {
    const declaredSitemaps = Array.from(
      { length: 6 },
      (_, index) => `${ORIGIN}/sitemap-${index}.xml`
    );
    fetchContent.mockImplementation(async (url) => toUrlSet([`${url.replace('.xml', '')}/page`]));

    const pages = await discover({ declaredSitemaps });

    expect(pages).toHaveLength(3);
    expect(getFetchedUrls()).toEqual(declaredSitemaps.slice(0, 3));
  });

  it('never fetches more than 3 sitemaps when none of them can be read', async () => {
    const declaredSitemaps = Array.from(
      { length: 6 },
      (_, index) => `${ORIGIN}/sitemap-${index}.xml`
    );

    await expect(discover({ declaredSitemaps })).resolves.toEqual([]);
    expect(fetchContent).toHaveBeenCalledTimes(3);
  });

  it('skips a sitemap that cannot be read and continues with the next one', async () => {
    mockSitemaps({
      [`${ORIGIN}/broken.xml`]: undefined,
      [`${ORIGIN}/empty.xml`]: '',
      [`${ORIGIN}/good.xml`]: toUrlSet(toPages(2)),
    });

    await expect(
      discover({
        declaredSitemaps: [`${ORIGIN}/broken.xml`, `${ORIGIN}/empty.xml`, `${ORIGIN}/good.xml`],
      })
    ).resolves.toEqual(toPages(2));
    expect(fetchContent).toHaveBeenCalledTimes(3);
  });

  it('returns no page when the only sitemap cannot be read', async () => {
    await expect(discover()).resolves.toEqual([]);
    expect(getFetchedUrls()).toEqual([SITEMAP_URL]);
  });

  it('returns at most maxPages pages, taken from the sitemaps in the order they were declared', async () => {
    mockSitemaps({
      [`${ORIGIN}/a.xml`]: toUrlSet(toPages(10, 'a')),
      [`${ORIGIN}/b.xml`]: toUrlSet(toPages(10, 'b')),
    });

    await expect(
      discover({ declaredSitemaps: [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`], maxPages: 4 })
    ).resolves.toEqual(toPages(4, 'a'));
  });

  it('stops fetching nested sitemaps once it has maxPages pages', async () => {
    mockSitemaps({
      [SITEMAP_URL]: [toSitemapIndex([`${ORIGIN}/nested.xml`]), toUrlSet(toPages(10, 'a'))].join(
        '\n'
      ),
      [`${ORIGIN}/nested.xml`]: toUrlSet(toPages(10, 'nested')),
    });

    await expect(discover({ maxPages: 4 })).resolves.toHaveLength(4);
    expect(getFetchedUrls()).toEqual([SITEMAP_URL]);
  });

  it('fills the page budget across sitemaps', async () => {
    mockSitemaps({
      [`${ORIGIN}/a.xml`]: toUrlSet(toPages(3, 'a')),
      [`${ORIGIN}/b.xml`]: toUrlSet(toPages(10, 'b')),
    });

    await expect(
      discover({ declaredSitemaps: [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`], maxPages: 5 })
    ).resolves.toEqual([...toPages(3, 'a'), ...toPages(2, 'b')]);
  });

  it('does not fetch anything when maxPages is 0', async () => {
    await expect(discover({ maxPages: 0 })).resolves.toEqual([]);
    expect(fetchContent).not.toHaveBeenCalled();
  });

  it('does not fetch anything when the signal is already aborted', async () => {
    mockSitemaps({ [SITEMAP_URL]: toUrlSet(toPages(3)) });
    abortController.abort();

    await expect(discover()).resolves.toEqual([]);
    expect(fetchContent).not.toHaveBeenCalled();
  });

  it('stops fetching when the signal is aborted', async () => {
    fetchContent.mockImplementation(async (url) => {
      abortController.abort();
      return [
        toSitemapIndex([`${ORIGIN}/nested.xml`]),
        toUrlSet([`${url.replace('.xml', '')}/page`]),
      ].join('\n');
    });

    await expect(
      discover({ declaredSitemaps: [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`] })
    ).resolves.toEqual([`${ORIGIN}/a/page`, `${ORIGIN}/b/page`]);
    expect(getFetchedUrls()).toEqual([`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`]);
  });

  describe('parallel fetching', () => {
    let pendingFetches: Map<string, (content: string | undefined) => void>;

    const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

    beforeEach(() => {
      pendingFetches = new Map();
      fetchContent.mockImplementation(
        (url) => new Promise((resolve) => pendingFetches.set(url, resolve))
      );
    });

    const answer = (url: string, content: string | undefined) => {
      pendingFetches.get(url)?.(content);
      pendingFetches.delete(url);
    };

    it('fetches the declared sitemaps side by side', async () => {
      const declaredSitemaps = [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`, `${ORIGIN}/c.xml`];

      const discovery = discover({ declaredSitemaps });
      await flushPromises();

      expect(getFetchedUrls()).toEqual(declaredSitemaps);
      expect([...pendingFetches.keys()]).toEqual(declaredSitemaps);

      answer(`${ORIGIN}/c.xml`, toUrlSet(toPages(1, 'c')));
      answer(`${ORIGIN}/a.xml`, toUrlSet(toPages(1, 'a')));
      answer(`${ORIGIN}/b.xml`, toUrlSet(toPages(1, 'b')));

      await expect(discovery).resolves.toEqual([
        ...toPages(1, 'a'),
        ...toPages(1, 'b'),
        ...toPages(1, 'c'),
      ]);
    });

    it('fetches the sitemaps of a sitemap index side by side, once the index was read', async () => {
      const nested = Array.from({ length: 8 }, (_, index) => `${ORIGIN}/sitemap-${index}.xml`);

      const discovery = discover();
      await flushPromises();

      expect(getFetchedUrls()).toEqual([SITEMAP_URL]);

      answer(SITEMAP_URL, toSitemapIndex(nested));
      await flushPromises();

      expect(getFetchedUrls()).toEqual([SITEMAP_URL, nested[0], nested[1]]);
      expect([...pendingFetches.keys()]).toEqual([nested[0], nested[1]]);

      answer(nested[1], toUrlSet(toPages(1, 'second')));
      answer(nested[0], toUrlSet(toPages(1, 'first')));

      await expect(discovery).resolves.toEqual([...toPages(1, 'first'), ...toPages(1, 'second')]);
      expect(fetchContent).toHaveBeenCalledTimes(3);
    });

    it('spends the 3 requests on the first batch when 3 or more sitemaps are declared', async () => {
      const declaredSitemaps = Array.from(
        { length: 5 },
        (_, index) => `${ORIGIN}/sitemap-${index}.xml`
      );

      const discovery = discover({ declaredSitemaps });
      await flushPromises();

      expect(getFetchedUrls()).toEqual(declaredSitemaps.slice(0, 3));

      declaredSitemaps
        .slice(0, 3)
        .forEach((url) => answer(url, toSitemapIndex([`${ORIGIN}/nested.xml`])));

      await expect(discovery).resolves.toEqual([]);
      expect(fetchContent).toHaveBeenCalledTimes(3);
    });

    it('waits for a slow sitemap of the batch before reading the nested ones', async () => {
      const discovery = discover({ declaredSitemaps: [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`] });
      await flushPromises();

      answer(`${ORIGIN}/a.xml`, toSitemapIndex([`${ORIGIN}/nested.xml`]));
      await flushPromises();

      expect(fetchContent).toHaveBeenCalledTimes(2);

      answer(`${ORIGIN}/b.xml`, undefined);
      await flushPromises();

      expect(getFetchedUrls()).toEqual([
        `${ORIGIN}/a.xml`,
        `${ORIGIN}/b.xml`,
        `${ORIGIN}/nested.xml`,
      ]);

      answer(`${ORIGIN}/nested.xml`, toUrlSet(toPages(2)));

      await expect(discovery).resolves.toEqual(toPages(2));
    });
  });

  it('does not fetch a sitemap that is declared twice', async () => {
    mockSitemaps({
      [`${ORIGIN}/a.xml`]: toUrlSet(toPages(2, 'a')),
      [`${ORIGIN}/b.xml`]: toUrlSet(toPages(2, 'b')),
      [`${ORIGIN}/c.xml`]: toUrlSet(toPages(2, 'c')),
    });

    await expect(
      discover({
        declaredSitemaps: [
          `${ORIGIN}/a.xml`,
          `${ORIGIN}/a.xml`,
          `${ORIGIN}/a.xml#fragment`,
          `${ORIGIN}/b.xml`,
          `${ORIGIN}/c.xml`,
        ],
      })
    ).resolves.toEqual([...toPages(2, 'a'), ...toPages(2, 'b'), ...toPages(2, 'c')]);
    expect(getFetchedUrls()).toEqual([`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`, `${ORIGIN}/c.xml`]);
  });

  it('does not fetch a sitemap again when sitemap indexes reference each other', async () => {
    mockSitemaps({
      [SITEMAP_URL]: toSitemapIndex([SITEMAP_URL, `${ORIGIN}/nested.xml`, `${ORIGIN}/nested.xml`]),
      [`${ORIGIN}/nested.xml`]: [
        toSitemapIndex([SITEMAP_URL, `${ORIGIN}/nested.xml`]),
        toUrlSet(toPages(2)),
      ].join('\n'),
    });

    await expect(discover()).resolves.toEqual(toPages(2));
    expect(getFetchedUrls()).toEqual([SITEMAP_URL, `${ORIGIN}/nested.xml`]);
  });

  it('dedupes the pages listed by several sitemaps and keeps only same-site pages', async () => {
    mockSitemaps({
      [`${ORIGIN}/a.xml`]: toUrlSet([`${ORIGIN}/shared`, `${ORIGIN}/a`, 'https://other.org/x']),
      [`${ORIGIN}/b.xml`]: toUrlSet([`${ORIGIN}/shared`, `${ORIGIN}/b`, `${ORIGIN}/file.pdf`]),
    });

    await expect(
      discover({ declaredSitemaps: [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`] })
    ).resolves.toEqual([`${ORIGIN}/shared`, `${ORIGIN}/a`, `${ORIGIN}/b`]);
  });

  it('keeps the same-site pages of a sitemap hosted on another host', async () => {
    mockSitemaps({
      'https://cdn.example.net/sitemap.xml': toUrlSet([`${ORIGIN}/a`, 'https://cdn.example.net/b']),
    });

    await expect(
      discover({ declaredSitemaps: ['https://cdn.example.net/sitemap.xml'] })
    ).resolves.toEqual([`${ORIGIN}/a`]);
  });

  describe('siteKeys', () => {
    const OTHER_ORIGIN = 'https://docs.example.org';
    const MIXED_SITES = toUrlSet([
      `${ORIGIN}/a`,
      `${OTHER_ORIGIN}/b`,
      'https://www.docs.example.org/c',
      'https://other.net/d',
    ]);

    it('collects only the pages of the site of the site URL by default', async () => {
      mockSitemaps({ [SITEMAP_URL]: MIXED_SITES });

      await expect(discover()).resolves.toEqual([`${ORIGIN}/a`]);
    });

    it('treats a www. site URL as the bare host by default', async () => {
      mockSitemaps({ 'https://www.example.com/sitemap.xml': MIXED_SITES });

      await expect(
        discoverSitemapPages({
          siteUrl: 'https://www.example.com/docs/start',
          declaredSitemaps: [],
          maxPages: 100,
          signal: abortController.signal,
          fetchContent,
        })
      ).resolves.toEqual([`${ORIGIN}/a`]);
      expect(getFetchedUrls()).toEqual(['https://www.example.com/sitemap.xml']);
    });

    it('collects the pages of every given site', async () => {
      mockSitemaps({ [SITEMAP_URL]: MIXED_SITES });

      await expect(discover({ siteKeys: [SITE_KEY, 'docs.example.org'] })).resolves.toEqual([
        `${ORIGIN}/a`,
        `${OTHER_ORIGIN}/b`,
        'https://www.docs.example.org/c',
      ]);
    });

    it('collects the pages of the given sites instead of those of the site URL', async () => {
      mockSitemaps({ [SITEMAP_URL]: MIXED_SITES });

      await expect(discover({ siteKeys: ['docs.example.org'] })).resolves.toEqual([
        `${OTHER_ORIGIN}/b`,
        'https://www.docs.example.org/c',
      ]);
    });

    it('collects no page, and still follows the sitemap index, when there is no site key', async () => {
      mockSitemaps({
        [SITEMAP_URL]: toSitemapIndex([`${ORIGIN}/nested.xml`]),
        [`${ORIGIN}/nested.xml`]: MIXED_SITES,
      });

      await expect(discover({ siteKeys: [] })).resolves.toEqual([]);
      expect(getFetchedUrls()).toEqual([SITEMAP_URL, `${ORIGIN}/nested.xml`]);
    });

    it('applies the site keys to the nested sitemaps too', async () => {
      mockSitemaps({
        [`${OTHER_ORIGIN}/index.xml`]: toSitemapIndex([`${OTHER_ORIGIN}/nested.xml`]),
        [`${OTHER_ORIGIN}/nested.xml`]: MIXED_SITES,
      });

      await expect(
        discover({
          declaredSitemaps: [`${OTHER_ORIGIN}/index.xml`],
          siteKeys: [SITE_KEY, 'docs.example.org'],
        })
      ).resolves.toEqual([`${ORIGIN}/a`, `${OTHER_ORIGIN}/b`, 'https://www.docs.example.org/c']);
    });

    it('dedupes a page that several sitemaps list, across sites', async () => {
      mockSitemaps({
        [`${ORIGIN}/a.xml`]: toUrlSet([`${OTHER_ORIGIN}/shared`, `${ORIGIN}/a`]),
        [`${OTHER_ORIGIN}/b.xml`]: toUrlSet([`${OTHER_ORIGIN}/shared`, `${OTHER_ORIGIN}/b`]),
      });

      await expect(
        discover({
          declaredSitemaps: [`${ORIGIN}/a.xml`, `${OTHER_ORIGIN}/b.xml`],
          siteKeys: [SITE_KEY, 'docs.example.org'],
        })
      ).resolves.toEqual([`${OTHER_ORIGIN}/shared`, `${ORIGIN}/a`, `${OTHER_ORIGIN}/b`]);
    });

    it('fills the page budget across the sites, in the order the sitemaps were declared', async () => {
      mockSitemaps({
        [`${ORIGIN}/a.xml`]: toUrlSet(toPages(3, 'a')),
        [`${OTHER_ORIGIN}/b.xml`]: toUrlSet([`${OTHER_ORIGIN}/b-0`, `${OTHER_ORIGIN}/b-1`]),
      });

      await expect(
        discover({
          declaredSitemaps: [`${ORIGIN}/a.xml`, `${OTHER_ORIGIN}/b.xml`],
          siteKeys: [SITE_KEY, 'docs.example.org'],
          maxPages: 4,
        })
      ).resolves.toEqual([...toPages(3, 'a'), `${OTHER_ORIGIN}/b-0`]);
    });
  });

  describe('maxRequests', () => {
    const toSitemapUrls = (count: number): string[] =>
      Array.from({ length: count }, (_, index) => `${ORIGIN}/sitemap-${index}.xml`);

    beforeEach(() => {
      fetchContent.mockImplementation(async (url) => toUrlSet([`${url.replace('.xml', '')}/page`]));
    });

    it('allows 3 requests by default', async () => {
      expect(MAX_SITEMAP_REQUESTS).toBe(3);

      await discover({ declaredSitemaps: toSitemapUrls(6) });

      expect(getFetchedUrls()).toEqual(toSitemapUrls(6).slice(0, MAX_SITEMAP_REQUESTS));
    });

    it.each([1, 2, 4, 5])('fetches no more than %i of 6 declared sitemaps', async (maxRequests) => {
      const declaredSitemaps = toSitemapUrls(6);

      const pages = await discover({ declaredSitemaps, maxRequests });

      expect(getFetchedUrls()).toEqual(declaredSitemaps.slice(0, maxRequests));
      expect(pages).toEqual(
        declaredSitemaps.slice(0, maxRequests).map((url) => `${url.replace('.xml', '')}/page`)
      );
    });

    it('fetches every declared sitemap when the budget is larger than their number', async () => {
      const declaredSitemaps = toSitemapUrls(4);

      await expect(discover({ declaredSitemaps, maxRequests: 10 })).resolves.toHaveLength(4);
      expect(getFetchedUrls()).toEqual(declaredSitemaps);
    });

    it('fetches nothing when no request is allowed', async () => {
      await expect(
        discover({ declaredSitemaps: toSitemapUrls(2), maxRequests: 0 })
      ).resolves.toEqual([]);
      expect(fetchContent).not.toHaveBeenCalled();
    });

    it('counts the sitemap index and the sitemaps it lists against the same budget', async () => {
      const nested = toSitemapUrls(8);
      fetchContent.mockImplementation(async (url) =>
        url === SITEMAP_URL ? toSitemapIndex(nested) : toUrlSet([`${url.replace('.xml', '')}/page`])
      );

      const pages = await discover({ maxRequests: 5 });

      expect(getFetchedUrls()).toEqual([SITEMAP_URL, ...nested.slice(0, 4)]);
      expect(pages).toHaveLength(4);
    });

    it('leaves the requests the declared sitemaps did not use to the sitemaps they list', async () => {
      const declaredSitemaps = [`${ORIGIN}/index-a.xml`, `${ORIGIN}/index-b.xml`];
      const nested = toSitemapUrls(6);
      mockSitemaps({
        [declaredSitemaps[0]]: toSitemapIndex(nested.slice(0, 3)),
        [declaredSitemaps[1]]: toSitemapIndex(nested.slice(3)),
        ...Object.fromEntries(nested.map((url) => [url, toUrlSet([`${url}/page`])])),
      });

      await discover({ declaredSitemaps, maxRequests: declaredSitemaps.length + 3 });

      expect(getFetchedUrls()).toEqual([...declaredSitemaps, ...nested.slice(0, 3)]);
    });

    it('does not spend a request on a sitemap that is declared twice', async () => {
      const [first, second, third] = toSitemapUrls(3);

      await discover({ declaredSitemaps: [first, first, second, third], maxRequests: 3 });

      expect(getFetchedUrls()).toEqual([first, second, third]);
    });

    it('spends a request on a sitemap that cannot be read', async () => {
      const declaredSitemaps = toSitemapUrls(4);
      mockSitemaps({ [declaredSitemaps[2]]: toUrlSet(toPages(1)) });

      await expect(discover({ declaredSitemaps, maxRequests: 2 })).resolves.toEqual([]);
      expect(getFetchedUrls()).toEqual(declaredSitemaps.slice(0, 2));
    });

    it('still stops at maxPages before the requests are used up', async () => {
      const nested = toSitemapUrls(8);
      mockSitemaps({
        [SITEMAP_URL]: toSitemapIndex([`${ORIGIN}/first.xml`]),
        [`${ORIGIN}/first.xml`]: [toUrlSet(toPages(2)), toSitemapIndex(nested)].join('\n'),
      });

      await expect(discover({ maxRequests: 10, maxPages: 2 })).resolves.toEqual(toPages(2));
      expect(getFetchedUrls()).toEqual([SITEMAP_URL, `${ORIGIN}/first.xml`]);
    });
  });
});
