/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discoverSitemapPages, parseSitemap } from './sitemap';

const ORIGIN = 'https://example.com';
const OTHER_ORIGIN = 'https://docs.example.org';
const SITE_URL = `${ORIGIN}/docs/start`;
const SITE_KEY = 'example.com';
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;

const toUrlSet = (locations: string[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map(
      (location) =>
        `  <url>\n    <loc>${location}</loc>\n    <lastmod>2024-12-05</lastmod>\n  </url>`
    ),
    '</urlset>',
  ].join('\n');

const toSitemapIndex = (locations: string[]): string =>
  [
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations.map((location) => `  <sitemap><loc>${location}</loc></sitemap>`),
    '</sitemapindex>',
  ].join('\n');

const toMarkdown = (locations: string[]): string =>
  locations.map((location) => `[${location}](${location})  \n2024-12-05`).join('\n\n');

const toPages = (count: number, prefix: string = 'page'): string[] =>
  Array.from({ length: count }, (_, index) => `${ORIGIN}/${prefix}-${index}`);

const toSitemapUrls = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `${ORIGIN}/sitemap-${index}.xml`);

const MIXED_SITES = toUrlSet([
  `${ORIGIN}/a`,
  `${OTHER_ORIGIN}/b`,
  'https://www.docs.example.org/c',
  'https://other.net/d',
]);

describe('parseSitemap', () => {
  const parse = (content: string, maxPages: number = 100, siteKeys: string[] = [SITE_KEY]) =>
    parseSitemap(content, SITEMAP_URL, { siteKeys, maxPages });

  it('reads the `<loc>` entries of an XML sitemap, resolved against the sitemap URL', () => {
    const content = [
      toUrlSet([`${ORIGIN}/`, `${ORIGIN}/docs/a?page=2`, '/docs/b']),
      `<url><loc>\n   ${ORIGIN}/c\n  </loc></url><url><loc>https://user:secret@example.com/d#top</loc></url>`,
    ].join('\n');

    expect(parse(content)).toEqual({
      pageUrls: [
        `${ORIGIN}/`,
        `${ORIGIN}/docs/a?page=2`,
        `${ORIGIN}/docs/b`,
        `${ORIGIN}/c`,
        `${ORIGIN}/d`,
      ],
      sitemapUrls: [],
      isTruncated: false,
    });
  });

  it('reads the entries of a sitemap that was converted to markdown links', () => {
    expect(parse(toMarkdown([`${ORIGIN}/a`, `${ORIGIN}/nested.xml`, `${ORIGIN}/b`]))).toEqual({
      pageUrls: [`${ORIGIN}/a`, `${ORIGIN}/b`],
      sitemapUrls: [`${ORIGIN}/nested.xml`],
      isTruncated: false,
    });
  });

  it('reads no entry from plain text, an empty `<loc>` or an unterminated one', () => {
    const empty = { pageUrls: [], sitemapUrls: [], isTruncated: false };

    expect(parse('# 404\n\nPage not found')).toEqual(empty);
    expect(parse(`${ORIGIN}/a\n${ORIGIN}/b`)).toEqual(empty);
    expect(parse('<url><loc></loc></url><url><loc><![CDATA[]]></loc></url>')).toEqual(empty);
    expect(parse(`<url><loc>${ORIGIN}/a</loc></url><url><loc>${ORIGIN}/b`).pageUrls).toEqual([
      `${ORIGIN}/a`,
    ]);
  });

  it('decodes the XML entities of a `<loc>` entry once', () => {
    const content = toUrlSet([
      `${ORIGIN}/quote?text=&quot;hi&quot;&amp;author=o&apos;neil`,
      `${ORIGIN}/compare?range=&lt;10&gt;`,
      `${ORIGIN}/a?b=1&amp;amp;c=2`,
    ]);

    expect(parse(content).pageUrls).toEqual([
      `${ORIGIN}/quote?text=%22hi%22&author=o%27neil`,
      `${ORIGIN}/compare?range=%3C10%3E`,
      `${ORIGIN}/a?b=1&amp;c=2`,
    ]);
  });

  it('unwraps a CDATA `<loc>` entry without decoding entities inside it', () => {
    const content = [
      `<url><loc>\n  <![CDATA[ ${ORIGIN}/a?b=1&c=2 ]]>\n</loc></url>`,
      `<url><loc><![CDATA[${ORIGIN}/literal?b=1&amp;c=2]]></loc></url>`,
      `<sitemap><loc><![CDATA[${ORIGIN}/nested.xml]]></loc></sitemap>`,
    ].join('\n');

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/a?b=1&c=2`, `${ORIGIN}/literal?b=1&amp;c=2`],
      sitemapUrls: [`${ORIGIN}/nested.xml`],
      isTruncated: false,
    });
  });

  it('only keeps the pages of the given sites, whatever the host of the sitemap', () => {
    const content = toUrlSet([
      `${ORIGIN}/same`,
      'http://www.example.com/www',
      `${OTHER_ORIGIN}/other`,
      'https://sub.example.com/page',
      'https://example.com.evil.org/page',
      'ftp://example.com/file',
      `${ORIGIN}/files/report.PDF`,
      `${OTHER_ORIGIN}/logo.png`,
    ]);
    const parseFrom = (siteKeys: string[]) =>
      parseSitemap(content, 'https://cdn.example.net/sitemap.xml', { siteKeys, maxPages: 100 })
        .pageUrls;

    expect(parseFrom([SITE_KEY])).toEqual([`${ORIGIN}/same`, 'http://www.example.com/www']);
    expect(parseFrom(['docs.example.org', SITE_KEY])).toEqual([
      `${ORIGIN}/same`,
      'http://www.example.com/www',
      `${OTHER_ORIGIN}/other`,
    ]);
  });

  it('returns the nested `.xml` sitemaps of any host separately, whatever the site keys', () => {
    const nested = [
      `${ORIGIN}/sitemaps/docs.xml`,
      `${ORIGIN}/sitemaps/BLOG.XML?page=2`,
      'https://cdn.example.net/c.xml',
    ];
    const content = [toSitemapIndex(nested), toUrlSet([`${ORIGIN}/a`])].join('\n');

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/a`],
      sitemapUrls: nested,
      isTruncated: false,
    });
    expect(parse(content, 100, [])).toEqual({
      pageUrls: [],
      sitemapUrls: nested,
      isTruncated: false,
    });
  });

  it('dedupes pages and nested sitemaps, including an entity-encoded and a plain entry', () => {
    const content = [
      toUrlSet([`${ORIGIN}/a`, `${ORIGIN}/a#fragment`, `${ORIGIN}/b?c=1&amp;d=2`]),
      toMarkdown([`${ORIGIN}/a`, `${ORIGIN}/b?c=1&d=2`, `${ORIGIN}/nested.xml`]),
      toSitemapIndex([`${ORIGIN}/nested.xml`]),
    ].join('\n');

    expect(parse(content)).toEqual({
      pageUrls: [`${ORIGIN}/a`, `${ORIGIN}/b?c=1&d=2`],
      sitemapUrls: [`${ORIGIN}/nested.xml`],
      isTruncated: false,
    });
  });

  it('lists files of the extensions it is given as pages', () => {
    const content = toUrlSet([`${ORIGIN}/a`, `${ORIGIN}/file.pdf`, `${ORIGIN}/photo.png`]);

    expect(parse(content).pageUrls).toEqual([`${ORIGIN}/a`]);
    expect(
      parseSitemap(content, SITEMAP_URL, {
        siteKeys: [SITE_KEY],
        maxPages: 100,
        fileExtensions: ['pdf'],
      }).pageUrls
    ).toEqual([`${ORIGIN}/a`, `${ORIGIN}/file.pdf`]);
  });

  it('takes a gzipped sitemap for a nested sitemap, not for a page or an asset', () => {
    const content = toUrlSet([`${ORIGIN}/sitemaps/pages.xml.gz`, `${ORIGIN}/SITEMAP.XML.GZ`]);

    expect(parse(content)).toEqual({
      pageUrls: [],
      sitemapUrls: [`${ORIGIN}/sitemaps/pages.xml.gz`, `${ORIGIN}/SITEMAP.XML.GZ`],
      isTruncated: false,
    });
  });

  it('counts only the pages it is not told about against maxPages', () => {
    const content = toUrlSet(toPages(6));
    const knownPages = new Set(toPages(4));

    expect(
      parseSitemap(content, SITEMAP_URL, { siteKeys: [SITE_KEY], maxPages: 2, knownPages }).pageUrls
    ).toEqual(toPages(6).slice(4));
  });

  it('keeps at most maxSitemaps nested sitemaps, and tells when it left some out', () => {
    const content = toSitemapIndex([...toSitemapUrls(3), `${ORIGIN}/sitemap-0.xml`]);
    const options = { siteKeys: [SITE_KEY], maxPages: 100 };

    expect(parseSitemap(content, SITEMAP_URL, { ...options, maxSitemaps: 3 })).toEqual({
      pageUrls: [],
      sitemapUrls: toSitemapUrls(3),
      isTruncated: false,
    });
    expect(parseSitemap(content, SITEMAP_URL, { ...options, maxSitemaps: 2 })).toEqual({
      pageUrls: [],
      sitemapUrls: toSitemapUrls(2),
      isTruncated: true,
    });
  });

  it('stops at maxPages pages, not counting duplicates or skipped entries', () => {
    const content = toUrlSet([
      `${ORIGIN}/a`,
      `${ORIGIN}/a`,
      'https://other.org/x',
      `${ORIGIN}/file.pdf`,
      `${ORIGIN}/b`,
      `${ORIGIN}/c`,
    ]);

    expect(parse(content, 2).pageUrls).toEqual([`${ORIGIN}/a`, `${ORIGIN}/b`]);
    expect(parse(content, 0).pageUrls).toEqual([]);
    expect(parse(toMarkdown(toPages(10)), 3).pageUrls).toEqual(toPages(3));
  });

  it('stays fast on a very large sitemap and on a pathological one', () => {
    const startedAt = performance.now();
    const { pageUrls } = parse(toUrlSet(toPages(50_000)), 1000);
    const pathological = parse('<loc>'.repeat(200_000));
    const elapsedMs = performance.now() - startedAt;

    expect(pageUrls).toHaveLength(1000);
    expect(pathological).toEqual({ pageUrls: [], sitemapUrls: [], isTruncated: false });
    expect(elapsedMs).toBeLessThan(2000);
  });
});

describe('discoverSitemapPages', () => {
  let abortController: AbortController;
  let fetchContent: jest.Mock<Promise<string | undefined>, [string]>;

  const mockSitemaps = (sitemaps: Record<string, string | undefined>) => {
    fetchContent.mockImplementation(async (url) => sitemaps[url]);
  };

  const mockOnePagePerSitemap = (sitemapIndex: string) => {
    fetchContent.mockImplementation(async (url) =>
      url === SITEMAP_URL ? sitemapIndex : toUrlSet([`${url.replace('.xml', '')}/page`])
    );
  };

  const discover = ({
    siteUrl = SITE_URL,
    declaredSitemaps = [],
    maxPages = 100,
    ...options
  }: {
    siteUrl?: string;
    declaredSitemaps?: string[];
    maxPages?: number;
    siteKeys?: string[];
    maxRequests?: number;
    onIncomplete?: () => void;
  } = {}) =>
    discoverSitemapPages({
      siteUrl,
      declaredSitemaps,
      maxPages,
      ...options,
      signal: abortController.signal,
      fetchContent,
    });

  const getFetchedUrls = (): string[] => fetchContent.mock.calls.map(([url]) => url);

  beforeEach(() => {
    abortController = new AbortController();
    fetchContent = jest.fn();
    mockSitemaps({});
  });

  it('falls back to /sitemap.xml at the site root when no valid sitemap is declared', async () => {
    mockSitemaps({ [SITEMAP_URL]: toUrlSet(toPages(3)) });

    await expect(discover()).resolves.toEqual(toPages(3));
    await expect(
      discover({ declaredSitemaps: ['ftp://example.com/sitemap.xml', 'http://[bad]/sitemap.xml'] })
    ).resolves.toEqual(toPages(3));
    expect(getFetchedUrls()).toEqual([SITEMAP_URL, SITEMAP_URL]);
  });

  it('reads the declared sitemaps instead of /sitemap.xml, each of them once', async () => {
    mockSitemaps({
      [SITEMAP_URL]: toUrlSet(toPages(3, 'default')),
      [`${ORIGIN}/sitemaps/docs.xml`]: toUrlSet([...toPages(2, 'docs'), 'https://other.org/x']),
      [`${ORIGIN}/sitemaps/blog.xml`]: toMarkdown([...toPages(2, 'blog'), `${ORIGIN}/docs-0`]),
    });

    await expect(
      discover({
        declaredSitemaps: [
          '/sitemaps/docs.xml',
          `${ORIGIN}/sitemaps/docs.xml#fragment`,
          `${ORIGIN}/sitemaps/blog.xml`,
        ],
      })
    ).resolves.toEqual([...toPages(2, 'docs'), ...toPages(2, 'blog')]);
    expect(getFetchedUrls()).toEqual([
      `${ORIGIN}/sitemaps/docs.xml`,
      `${ORIGIN}/sitemaps/blog.xml`,
    ]);
  });

  it('follows a sitemap index, without fetching a sitemap again when indexes reference each other', async () => {
    mockSitemaps({
      [SITEMAP_URL]: toSitemapIndex([SITEMAP_URL, `${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`]),
      [`${ORIGIN}/a.xml`]: [
        toSitemapIndex([SITEMAP_URL, `${ORIGIN}/a.xml`]),
        toUrlSet(toPages(2, 'a')),
      ].join('\n'),
      [`${ORIGIN}/b.xml`]: toUrlSet(toPages(2, 'b')),
    });

    await expect(discover({ maxRequests: 10 })).resolves.toEqual([
      ...toPages(2, 'a'),
      ...toPages(2, 'b'),
    ]);
    expect(getFetchedUrls()).toEqual([SITEMAP_URL, `${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`]);
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
  });

  describe('request budget', () => {
    it('fetches no more than 3 sitemaps by default, counting the index and those it lists', async () => {
      const nested = toSitemapUrls(8);
      mockOnePagePerSitemap(toSitemapIndex(nested));

      await expect(discover()).resolves.toEqual([
        `${ORIGIN}/sitemap-0/page`,
        `${ORIGIN}/sitemap-1/page`,
      ]);
      expect(getFetchedUrls()).toEqual([SITEMAP_URL, nested[0], nested[1]]);
    });

    it('fetches no more than 3 declared sitemaps by default, readable or not', async () => {
      const declaredSitemaps = toSitemapUrls(6);
      mockSitemaps({ [declaredSitemaps[3]]: toUrlSet(toPages(1)) });

      await expect(discover({ declaredSitemaps })).resolves.toEqual([]);
      expect(getFetchedUrls()).toEqual(declaredSitemaps.slice(0, 3));
    });

    it('fetches no more than maxRequests sitemaps', async () => {
      const nested = toSitemapUrls(8);
      mockOnePagePerSitemap(toSitemapIndex(nested));

      await expect(discover({ maxRequests: 5 })).resolves.toHaveLength(4);
      expect(getFetchedUrls()).toEqual([SITEMAP_URL, ...nested.slice(0, 4)]);

      fetchContent.mockClear();
      await expect(discover({ maxRequests: 0 })).resolves.toEqual([]);
      expect(fetchContent).not.toHaveBeenCalled();
    });

    it('leaves the requests the declared sitemaps did not use to the sitemaps they list', async () => {
      const declaredSitemaps = [`${ORIGIN}/index-a.xml`, `${ORIGIN}/index-b.xml`];
      const nested = toSitemapUrls(6);
      mockSitemaps({
        [declaredSitemaps[0]]: toSitemapIndex(nested.slice(0, 3)),
        [declaredSitemaps[1]]: toSitemapIndex(nested.slice(3)),
      });

      await discover({ declaredSitemaps, maxRequests: declaredSitemaps.length + 3 });

      expect(getFetchedUrls()).toEqual([...declaredSitemaps, ...nested.slice(0, 3)]);
    });
  });

  describe('page budget', () => {
    it('fills maxPages across the sitemaps, in the order they were declared', async () => {
      const declaredSitemaps = [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`, `${ORIGIN}/c.xml`];
      mockSitemaps({
        [declaredSitemaps[0]]: toUrlSet(toPages(3, 'a')),
        [declaredSitemaps[1]]: toUrlSet(toPages(10, 'b')),
        [declaredSitemaps[2]]: toUrlSet(toPages(10, 'c')),
      });

      await expect(discover({ declaredSitemaps, maxPages: 5 })).resolves.toEqual([
        ...toPages(3, 'a'),
        ...toPages(2, 'b'),
      ]);
    });

    it('stops fetching nested sitemaps once it has maxPages pages', async () => {
      mockSitemaps({
        [SITEMAP_URL]: [toSitemapIndex([`${ORIGIN}/nested.xml`]), toUrlSet(toPages(10))].join('\n'),
        [`${ORIGIN}/nested.xml`]: toUrlSet(toPages(10, 'nested')),
      });

      await expect(discover({ maxPages: 4, maxRequests: 10 })).resolves.toEqual(toPages(4));
      expect(getFetchedUrls()).toEqual([SITEMAP_URL]);
    });

    it('does not fetch anything when maxPages is 0', async () => {
      await expect(discover({ maxPages: 0 })).resolves.toEqual([]);
      expect(fetchContent).not.toHaveBeenCalled();
    });
  });

  describe('onIncomplete', () => {
    let onIncomplete: jest.Mock<void, []>;

    beforeEach(() => {
      onIncomplete = jest.fn();
    });

    it('is not called when every sitemap was read', async () => {
      mockSitemaps({
        [SITEMAP_URL]: toSitemapIndex([`${ORIGIN}/nested.xml`, SITEMAP_URL]),
        [`${ORIGIN}/nested.xml`]: toUrlSet(toPages(3)),
      });

      await discover({ onIncomplete });

      expect(onIncomplete).not.toHaveBeenCalled();
    });

    it('is called once when the request budget left sitemaps unread', async () => {
      mockOnePagePerSitemap(toSitemapIndex(toSitemapUrls(5)));

      await discover({ onIncomplete });

      expect(onIncomplete).toHaveBeenCalledTimes(1);
    });

    it('is called when the page budget was used up', async () => {
      mockSitemaps({ [SITEMAP_URL]: toUrlSet(toPages(10)) });

      await discover({ maxPages: 4, onIncomplete });

      expect(onIncomplete).toHaveBeenCalledTimes(1);
    });

    it('is not called when the signal is aborted', async () => {
      fetchContent.mockImplementation(async () => {
        abortController.abort();
        return toSitemapIndex(toSitemapUrls(5));
      });

      await discover({ onIncomplete });

      expect(onIncomplete).not.toHaveBeenCalled();
    });
  });

  describe('cancellation', () => {
    it('does not fetch anything when the signal is already aborted', async () => {
      mockSitemaps({ [SITEMAP_URL]: toUrlSet(toPages(3)) });
      abortController.abort();

      await expect(discover()).resolves.toEqual([]);
      expect(fetchContent).not.toHaveBeenCalled();
    });

    it('stops following sitemap indexes when the signal is aborted', async () => {
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
  });

  it('fetches the sitemaps known at the same time side by side, and the nested ones after them', async () => {
    const pendingFetches = new Map<string, (content: string | undefined) => void>();
    const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
    const declaredSitemaps = [`${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`];
    fetchContent.mockImplementation(
      (url) => new Promise((resolve) => pendingFetches.set(url, resolve))
    );

    const discovery = discover({ declaredSitemaps });
    await flushPromises();
    expect([...pendingFetches.keys()]).toEqual(declaredSitemaps);

    pendingFetches.get(`${ORIGIN}/b.xml`)?.(toSitemapIndex([`${ORIGIN}/nested.xml`]));
    await flushPromises();
    expect(getFetchedUrls()).toEqual(declaredSitemaps);

    pendingFetches.get(`${ORIGIN}/a.xml`)?.(toUrlSet(toPages(1, 'a')));
    await flushPromises();
    expect(getFetchedUrls()).toEqual([...declaredSitemaps, `${ORIGIN}/nested.xml`]);

    pendingFetches.get(`${ORIGIN}/nested.xml`)?.(toUrlSet(toPages(2, 'nested')));
    await expect(discovery).resolves.toEqual([...toPages(1, 'a'), ...toPages(2, 'nested')]);
  });

  describe('siteKeys', () => {
    it('collects only the pages of the site of the site URL by default', async () => {
      mockSitemaps({ 'https://www.example.com/sitemap.xml': MIXED_SITES });

      await expect(discover({ siteUrl: 'https://www.example.com/docs/start' })).resolves.toEqual([
        `${ORIGIN}/a`,
      ]);
    });

    it('collects the pages of the given sites instead, from nested sitemaps too', async () => {
      mockSitemaps({
        [SITEMAP_URL]: toSitemapIndex([`${OTHER_ORIGIN}/nested.xml`]),
        [`${OTHER_ORIGIN}/nested.xml`]: MIXED_SITES,
      });

      await expect(discover({ siteKeys: ['docs.example.org'] })).resolves.toEqual([
        `${OTHER_ORIGIN}/b`,
        'https://www.docs.example.org/c',
      ]);
      await expect(discover({ siteKeys: [SITE_KEY, 'docs.example.org'] })).resolves.toEqual([
        `${ORIGIN}/a`,
        `${OTHER_ORIGIN}/b`,
        'https://www.docs.example.org/c',
      ]);
    });
  });
});
