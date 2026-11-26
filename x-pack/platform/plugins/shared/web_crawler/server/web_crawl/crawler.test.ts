/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
} from '../../common/constants';
import { BULK_SIZE, MAX_CONCURRENT_BULKS } from './bulk_indexer';
import type { CrawlOptions, CrawlProgress, CrawlResult } from './crawler';
import {
  CRAWL_LIMITS,
  EXTRACTION_CONCURRENCY,
  MAX_CRAWL_DELAY_MS,
  ROBOTS_USER_AGENT,
  crawlSite,
} from './crawler';
import type { ExtractedPage } from './document_extraction';
import { extractPage, waitFor } from './document_extraction';
import { MAX_LINKS_PER_PAGE } from './links';

jest.mock('./document_extraction');

const mockExtractPage = extractPage as jest.MockedFunction<typeof extractPage>;
const mockWaitFor = waitFor as jest.MockedFunction<typeof waitFor>;

const ORIGIN = 'https://example.com';
const SEED_URL = `${ORIGIN}/`;
const ROBOTS_URL = `${ORIGIN}/robots.txt`;
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;
const EXPLICIT_SITEMAP_URL = `${ORIGIN}/custom/pages.xml`;
const OTHER_ORIGIN = 'https://docs.example.org';
const OTHER_SEED_URL = `${OTHER_ORIGIN}/`;
const OTHER_ROBOTS_URL = `${OTHER_ORIGIN}/robots.txt`;
const OTHER_SITEMAP_URL = `${OTHER_ORIGIN}/sitemap.xml`;
const NO_START_URL_ALLOWED =
  'The robots.txt of the sites does not allow crawling any of the start URLs';
const INDEX_NAME = 'web-crawl-example.com';
const INFERENCE_ID = '.jina-reader';
const CRAWL_ID = 'crawl-1';

type Site = Record<string, ExtractedPage | Error | undefined>;
type SiteFiles = Record<string, string | Error | undefined>;
type PageSource = (
  url: string,
  signal: AbortSignal
) => ExtractedPage | undefined | Promise<ExtractedPage | undefined>;

interface IndexedDocument {
  url: string;
  title: string;
  depth: number;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const range = <T>(count: number, toItem: (position: number) => T): T[] =>
  Array.from({ length: count }, (_, position) => toItem(position));

const pageLinkingTo = (links: string[], overrides: Partial<ExtractedPage> = {}): ExtractedPage => ({
  content: links.length > 0 ? links.map((link) => `[link](${link})`).join('\n') : 'No links here',
  ...overrides,
});

const toSitemap = (locations: string[]): string =>
  `<urlset>${locations.map((location) => `<url><loc>${location}</loc></url>`).join('')}</urlset>`;

const disallow = (...paths: string[]): string =>
  ['User-agent: *', ...paths.map((path) => `Disallow: ${path}`)].join('\n');

const toResult = (overrides: Partial<CrawlResult> = {}): CrawlResult => ({
  documentsCount: 0,
  failedCount: 0,
  skippedByRobotsCount: 0,
  skippedByRulesCount: 0,
  purgedCount: 0,
  aborted: false,
  ...overrides,
});

const toProgress = (overrides: Partial<CrawlProgress> = {}): CrawlProgress => ({
  documentsCount: 0,
  failedCount: 0,
  requestedCount: 0,
  queuedCount: 0,
  skippedByRobotsCount: 0,
  skippedByRulesCount: 0,
  ...overrides,
});

const isSiteFile = (url: string): boolean =>
  new URL(url).pathname === '/robots.txt' || url.endsWith('.xml');

const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const waitUntil = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 1000 && !condition(); attempt++) {
    await flushPromises();
  }
  expect(condition()).toBe(true);
};

const letCrawlRun = async () => {
  for (let round = 0; round < 50; round++) {
    await flushPromises();
  }
};

const whenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((resolve, reject) => {
    const rejectAborted = () => reject(new Error('Request aborted'));
    if (signal.aborted) {
      rejectAborted();
    } else {
      signal.addEventListener('abort', rejectAborted, { once: true });
    }
  });

describe('crawlSite', () => {
  let esClient: ElasticsearchClientMock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let abortController: AbortController;
  let siteFiles: SiteFiles;
  let heldUrls: Map<string, Promise<void>>;

  /** Keeps the request for `url` in flight until the returned function is called, or the crawl aborts. */
  const hold = (url: string): (() => void) => {
    let release: () => void = () => {};
    heldUrls.set(
      url,
      new Promise<void>((resolve) => {
        release = resolve;
      })
    );
    return release;
  };

  // robots.txt and sitemaps are served from `siteFiles`; every other URL is a page.
  const mockPages = (getPage: PageSource) => {
    mockExtractPage.mockImplementation(async (_, { url, signal }) => {
      const held = heldUrls.get(url);
      if (held) {
        await Promise.race([held, whenAborted(signal)]);
      }
      if (!isSiteFile(url)) {
        return getPage(url, signal);
      }
      const file = siteFiles[url];
      if (file instanceof Error) {
        throw file;
      }
      return file === undefined ? undefined : { content: file };
    });
  };

  const mockSite = (site: Site) => {
    mockPages((url) => {
      const page = site[url];
      if (page instanceof Error) {
        throw page;
      }
      return page;
    });
  };

  const mockSmallSite = (overrides: Site = {}) => {
    mockSite({
      [SEED_URL]: pageLinkingTo(['/a', '/b']),
      [`${ORIGIN}/a`]: pageLinkingTo([]),
      [`${ORIGIN}/b`]: pageLinkingTo([]),
      ...overrides,
    });
  };

  const mockTwoSites = (overrides: Site = {}) => {
    mockSite({
      [SEED_URL]: pageLinkingTo(['/a']),
      [`${ORIGIN}/a`]: pageLinkingTo([]),
      [OTHER_SEED_URL]: pageLinkingTo(['/b']),
      [`${OTHER_ORIGIN}/b`]: pageLinkingTo([]),
      ...overrides,
    });
  };

  const mockLargeSite = (sectionCount: number, pagesPerSection: number) => {
    mockPages((url) => {
      const { pathname } = new URL(url);
      return pageLinkingTo(
        pathname === '/'
          ? range(sectionCount, (section) => `/section-${section}`)
          : range(pagesPerSection, (page) => `${pathname}/page-${page}`)
      );
    });
  };

  const toBulkResponse = (
    operations: readonly unknown[],
    getError: (id: string) => string | undefined = () => undefined
  ) => {
    const items = operations
      .filter((_, position) => position % 2 === 0)
      .map((operation) => {
        const id = (operation as { index: { _id: string } }).index._id;
        const reason = getError(id);
        return {
          index: reason
            ? {
                _index: INDEX_NAME,
                _id: id,
                status: 400,
                error: { type: 'mapper_parsing_exception', reason },
              }
            : { _index: INDEX_NAME, _id: id, status: 201 },
        };
      });
    return { took: 1, errors: items.some(({ index }) => index.status !== 201), items };
  };

  const mockBulk = (getError?: (id: string) => string | undefined) => {
    esClient.bulk.mockImplementation(async (params) =>
      toBulkResponse(params?.operations ?? [], getError)
    );
  };

  /** Keeps every bulk request in flight until one of the returned functions is called. */
  const holdBulks = () => {
    let succeed: () => void = () => {};
    let fail: (error: Error) => void = () => {};
    const released = new Promise<void>((resolve, reject) => {
      succeed = resolve;
      fail = reject;
    });
    esClient.bulk.mockImplementation(async (params) => {
      await released;
      return toBulkResponse(params?.operations ?? []);
    });
    return { succeed, fail };
  };

  const getIndexedDocuments = (): IndexedDocument[] =>
    esClient.bulk.mock.calls.flatMap(([params]) =>
      (params?.operations ?? [])
        .filter((_, position) => position % 2 === 1)
        .map((operation) => operation as IndexedDocument)
    );

  const getIndexedDepths = (): Record<string, number> =>
    Object.fromEntries(getIndexedDocuments().map(({ url, depth }) => [url, depth]));

  const getRequestedUrls = (): string[] => mockExtractPage.mock.calls.map(([, { url }]) => url);

  const getPageRequests = (): string[] => getRequestedUrls().filter((url) => !isSiteFile(url));

  const getSiteFileRequests = (): string[] => getRequestedUrls().filter(isSiteFile);

  const getSignal = (requestedUrl: string): AbortSignal | undefined =>
    mockExtractPage.mock.calls.find(([, { url }]) => url === requestedUrl)?.[1].signal;

  const getPurgedHosts = (): string[] => {
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    const [{ query }] = esClient.deleteByQuery.mock.calls[0];
    const [, hostFilter] = [query?.bool?.filter].flat();
    return [hostFilter?.terms?.url_host].flat().map(String);
  };

  const crawl = (options: Partial<CrawlOptions> = {}) =>
    crawlSite({
      esClient,
      logger,
      signal: abortController.signal,
      url: SEED_URL,
      indexName: INDEX_NAME,
      inferenceId: INFERENCE_ID,
      crawlId: CRAWL_ID,
      maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
      maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
      ...options,
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    abortController = new AbortController();
    siteFiles = {};
    heldUrls = new Map();
    mockBulk();
    esClient.deleteByQuery.mockResolvedValue({ deleted: 0 });
  });

  describe('crawling', () => {
    it('extracts the start page and the pages it links to, and indexes them', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo([`${ORIGIN}/a`, '/docs/guide/intro?tab=1'], {
          title: 'Home',
          description: 'The home page',
        }),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/docs/guide/intro?tab=1`]: pageLinkingTo([], { title: 'Intro' }),
      });

      await expect(crawl()).resolves.toEqual(toResult({ documentsCount: 3 }));

      expect(getRequestedUrls()).toEqual([
        ROBOTS_URL,
        SITEMAP_URL,
        SEED_URL,
        `${ORIGIN}/a`,
        `${ORIGIN}/docs/guide/intro?tab=1`,
      ]);
      expect(mockExtractPage).toHaveBeenCalledWith(esClient, {
        inferenceId: INFERENCE_ID,
        url: SEED_URL,
        signal: expect.any(AbortSignal),
      });
      for (const [params] of esClient.bulk.mock.calls) {
        expect(params?.index).toBe(INDEX_NAME);
      }
      expect(getIndexedDocuments()).toEqual([
        {
          url: SEED_URL,
          title: 'Home',
          description: 'The home page',
          content: `[link](${ORIGIN}/a)\n[link](/docs/guide/intro?tab=1)`,
          depth: 0,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
          url_host: 'example.com',
          url_path: '/',
        },
        {
          url: `${ORIGIN}/a`,
          title: `${ORIGIN}/a`,
          content: 'No links here',
          depth: 1,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
          url_host: 'example.com',
          url_path: '/a',
          url_path_dir1: 'a',
        },
        {
          url: `${ORIGIN}/docs/guide/intro?tab=1`,
          title: 'Intro',
          content: 'No links here',
          depth: 1,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
          url_host: 'example.com',
          url_path: '/docs/guide/intro',
          url_path_dir1: 'docs',
          url_path_dir2: 'guide',
          url_path_dir3: 'intro',
        },
      ]);
    });

    it('truncates very large page content but still follows the links past the cut', async () => {
      mockSite({
        [SEED_URL]: { content: `${'a'.repeat(600_000)} [late](/late)` },
        [`${ORIGIN}/late`]: pageLinkingTo([]),
      });

      await crawl();

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/late`]);
      expect(getIndexedDocuments()[0]).toEqual(
        expect.objectContaining({ content: 'a'.repeat(500_000) })
      );
    });

    it('does not cut very large page content in the middle of a character', async () => {
      mockSite({ [SEED_URL]: { content: `${'a'.repeat(499_999)}😀 and more` } });

      await crawl();

      expect(getIndexedDocuments()[0]).toEqual(
        expect.objectContaining({ content: 'a'.repeat(499_999) })
      );
    });

    it('does not follow the links found on pages at the maximum depth', async () => {
      mockPages((url) => {
        const { pathname } = new URL(url);
        const depth = pathname === '/' ? 0 : Number(pathname.replace('/depth-', ''));
        return pageLinkingTo([`/depth-${depth + 1}`]);
      });

      await expect(crawl({ maxDepth: 3 })).resolves.toEqual(toResult({ documentsCount: 4 }));

      expect(getIndexedDepths()).toEqual({
        [SEED_URL]: 0,
        [`${ORIGIN}/depth-1`]: 1,
        [`${ORIGIN}/depth-2`]: 2,
        [`${ORIGIN}/depth-3`]: 3,
      });
    });

    it('never fetches a URL twice, and records the shortest depth at which a page was found', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo([
          '/',
          '/a',
          '/a',
          '/a#section',
          '/b',
          '/broken',
          `${ORIGIN}/#top`,
        ]),
        [`${ORIGIN}/a`]: pageLinkingTo(['/', '/a', '/b', '/c', '/broken']),
        [`${ORIGIN}/b`]: pageLinkingTo(['/a', '/c#one', '/c#two', '/']),
        [`${ORIGIN}/c`]: pageLinkingTo(['/', '/a', '/b', '/c']),
        [`${ORIGIN}/broken`]: new Error('extraction failed'),
      });

      await expect(crawl()).resolves.toEqual(toResult({ documentsCount: 4, failedCount: 1 }));

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/a`,
        `${ORIGIN}/b`,
        `${ORIGIN}/broken`,
        `${ORIGIN}/c`,
      ]);
      expect(getIndexedDepths()).toEqual({
        [SEED_URL]: 0,
        [`${ORIGIN}/a`]: 1,
        [`${ORIGIN}/b`]: 1,
        [`${ORIGIN}/c`]: 2,
      });
    });
  });

  describe('robots.txt', () => {
    it('reads robots.txt from the root of the site before it requests anything else', async () => {
      const releaseRobots = hold(ROBOTS_URL);
      mockSite({ [`${ORIGIN}/docs/start?tab=1`]: pageLinkingTo([]) });

      const crawling = crawl({ url: `${ORIGIN}/docs/start?tab=1` });
      await letCrawlRun();

      expect(getRequestedUrls()).toEqual([ROBOTS_URL]);

      releaseRobots();
      await crawling;

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SITEMAP_URL, `${ORIGIN}/docs/start?tab=1`]);
    });

    it('rejects without requesting any page when the only start URL is disallowed', async () => {
      siteFiles[ROBOTS_URL] = disallow('/');
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
      mockSite({ [SEED_URL]: pageLinkingTo(['/a']) });
      const removeEventListener = jest.spyOn(abortController.signal, 'removeEventListener');

      await expect(crawl({ additionalSeedUrls: [SEED_URL] })).rejects.toThrow(
        new Error(`The site's robots.txt does not allow crawling ${SEED_URL}`)
      );

      expect(getRequestedUrls()).toEqual([ROBOTS_URL]);
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('never requests the links that its group of robots.txt disallows, and counts each once', async () => {
      siteFiles[ROBOTS_URL] = [
        'User-agent: *',
        'Disallow: /',
        '',
        `User-agent: ${ROBOTS_USER_AGENT}`,
        'Disallow: /private',
        'Allow: /private/press',
      ].join('\n');
      siteFiles[SITEMAP_URL] = toSitemap([
        `${ORIGIN}/private/from-sitemap`,
        `${ORIGIN}/sitemap-ok`,
      ]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/private/a', '/public', '/private/press']),
        [`${ORIGIN}/public`]: pageLinkingTo(['/private/a', '/private/b']),
        [`${ORIGIN}/private/press`]: pageLinkingTo([]),
        [`${ORIGIN}/sitemap-ok`]: pageLinkingTo(['/private/c']),
      });

      await expect(crawl()).resolves.toEqual(
        toResult({ documentsCount: 4, skippedByRobotsCount: 4 })
      );

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/public`,
        `${ORIGIN}/private/press`,
        `${ORIGIN}/sitemap-ok`,
      ]);
    });

    it.each([
      ['cannot be read', new Error('robots.txt unavailable')],
      ['has no content', undefined],
    ])('allows everything when robots.txt %s', async (_, robotsTxt) => {
      siteFiles[ROBOTS_URL] = robotsTxt;
      siteFiles[SITEMAP_URL] = new Error('sitemap unavailable');
      mockSite({
        [SEED_URL]: pageLinkingTo(['/private']),
        [`${ORIGIN}/private`]: pageLinkingTo([]),
      });

      await expect(crawl()).resolves.toEqual(toResult({ documentsCount: 2 }));
    });
  });

  describe('path rules', () => {
    it('applies the rules to links and sitemap pages, but not to the start URL', async () => {
      siteFiles[ROBOTS_URL] = disallow('/blog/private');
      siteFiles[SITEMAP_URL] = toSitemap([
        `${ORIGIN}/docs/from-sitemap`,
        `${ORIGIN}/shop/from-sitemap`,
        `${ORIGIN}/docs/internal/from-sitemap`,
      ]);
      mockSite({
        [`${ORIGIN}/blog/start`]: pageLinkingTo([
          '/docs/a',
          '/blog/private',
          '/docs/internal/a',
          '/shop',
        ]),
        [`${ORIGIN}/docs/a`]: pageLinkingTo(['/blog/start', '/shop', '/shop#top']),
        [`${ORIGIN}/docs/from-sitemap`]: pageLinkingTo([]),
      });

      await expect(
        crawl({
          url: `${ORIGIN}/blog/start`,
          pathRules: { includePaths: ['/docs'], excludePaths: ['/docs/internal'] },
        })
      ).resolves.toEqual(toResult({ documentsCount: 3, skippedByRulesCount: 5 }));

      expect(getPageRequests()).toEqual([
        `${ORIGIN}/blog/start`,
        `${ORIGIN}/docs/a`,
        `${ORIGIN}/docs/from-sitemap`,
      ]);
    });

    it('does not spend the page budget on the links that the rules or robots.txt skip', async () => {
      siteFiles[ROBOTS_URL] = disallow('/private');
      mockPages((url) =>
        pageLinkingTo(url === SEED_URL ? ['/private/a', '/blog/a', '/x', '/y', '/z'] : [])
      );

      await expect(
        crawl({ maxDocuments: 3, pathRules: { includePaths: [], excludePaths: ['/blog'] } })
      ).resolves.toEqual(
        toResult({ documentsCount: 3, skippedByRobotsCount: 1, skippedByRulesCount: 1 })
      );

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/x`, `${ORIGIN}/y`]);
    });
  });

  describe('sitemaps', () => {
    it('queues the sitemap pages at depth 1 behind the links of the start page, even when the sitemap is read first', async () => {
      const releaseSeed = hold(SEED_URL);
      const linkedPages = range(EXTRACTION_CONCURRENCY + 2, (page) => `${ORIGIN}/linked-${page}`);
      const sitemapPages = [`${ORIGIN}/from-sitemap-1`, `${ORIGIN}/from-sitemap-2`];
      siteFiles[SITEMAP_URL] = toSitemap(sitemapPages);
      mockPages((url) => pageLinkingTo(url === SEED_URL ? linkedPages : []));

      const crawling = crawl();
      await letCrawlRun();

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SITEMAP_URL, SEED_URL]);

      releaseSeed();
      await crawling;

      expect(getPageRequests()).toEqual([SEED_URL, ...linkedPages, ...sitemapPages]);
      expect(getIndexedDepths()[sitemapPages[0]]).toBe(1);
    });

    it('reads the sitemap while the start page and the pages below it are crawled', async () => {
      const releaseSitemap = hold(SITEMAP_URL);
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a']),
        [`${ORIGIN}/a`]: pageLinkingTo(['/b']),
        [`${ORIGIN}/b`]: pageLinkingTo([]),
        [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]),
      });

      const crawling = crawl();
      await waitUntil(() => getIndexedDocuments().length === 3);
      await letCrawlRun();

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`]);

      releaseSitemap();

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 4 }));
      expect(getIndexedDepths()[`${ORIGIN}/from-sitemap`]).toBe(1);
    });

    it('requests a page once when the sitemap and links both list it, and never crawls robots.txt or a sitemap as a page', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([
        SEED_URL,
        `${ORIGIN}/#top`,
        ROBOTS_URL,
        `${ORIGIN}/linked`,
        `${ORIGIN}/sitemap-only`,
        `${ORIGIN}/sitemap-only`,
      ]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/linked', '/robots.txt', '/sitemap.xml']),
        [`${ORIGIN}/linked`]: pageLinkingTo(['/sitemap-only']),
        [`${ORIGIN}/sitemap-only`]: pageLinkingTo([]),
      });

      await expect(crawl()).resolves.toEqual(toResult({ documentsCount: 3 }));

      expect(getRequestedUrls()).toEqual([
        ROBOTS_URL,
        SITEMAP_URL,
        SEED_URL,
        `${ORIGIN}/linked`,
        `${ORIGIN}/sitemap-only`,
      ]);
    });

    it.each([
      ['the maximum depth is 0', { maxDepth: 0 }],
      ['only one document may be crawled', { maxDocuments: 1 }],
    ])('does not read any sitemap when %s', async (_, limits) => {
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      mockPages(() => pageLinkingTo(['/linked']));

      await expect(crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL], ...limits })).resolves.toEqual(
        toResult({ documentsCount: 1 })
      );

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SEED_URL]);
    });
  });

  describe('explicit sitemap URLs', () => {
    it('reads one that a crawl would not follow as a link', async () => {
      const deepSitemapUrl = `${ORIGIN}/${range(17, (level) => `s${level}`).join('/')}/sitemap.xml`;
      siteFiles[deepSitemapUrl] = toSitemap([`${ORIGIN}/from-deep`]);
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls: [deepSitemapUrl] });

      expect(getSiteFileRequests()).toContain(deepSitemapUrl);
      expect(getIndexedDepths()).toEqual({ [SEED_URL]: 0, [`${ORIGIN}/from-deep`]: 1 });
    });

    it('does not crawl one as a page when a page links to it', async () => {
      const feedUrl = `${ORIGIN}/feeds/pages`;
      mockSite({
        [SEED_URL]: pageLinkingTo(['/feeds/pages']),
        [feedUrl]: { content: toSitemap([`${ORIGIN}/from-feed`]) },
        [`${ORIGIN}/from-feed`]: pageLinkingTo([]),
      });

      await crawl({ sitemapUrls: [feedUrl] });

      expect(getIndexedDepths()).toEqual({ [SEED_URL]: 0, [`${ORIGIN}/from-feed`]: 1 });
    });

    it('queues their pages after the links of the start page and before the pages of the other sitemaps, even when they are read last', async () => {
      const releaseExplicit = hold(EXPLICIT_SITEMAP_URL);
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([
        `${ORIGIN}/from-explicit-1`,
        `${ORIGIN}/from-explicit-2`,
      ]);
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-site`]);
      mockPages((url) => pageLinkingTo(url === SEED_URL ? ['/linked'] : []));

      const crawling = crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] });
      await letCrawlRun();

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, EXPLICIT_SITEMAP_URL, SITEMAP_URL]);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/linked`]);

      releaseExplicit();
      await crawling;

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/linked`,
        `${ORIGIN}/from-explicit-1`,
        `${ORIGIN}/from-explicit-2`,
        `${ORIGIN}/from-site`,
      ]);
      expect(getIndexedDepths()[`${ORIGIN}/from-explicit-1`]).toBe(1);
    });

    it('does not take the requests for the explicit sitemaps from those of the sites', async () => {
      const declared = range(5, (sitemap) => `${ORIGIN}/declared-${sitemap}.xml`);
      const sitemapUrls = range(4, (sitemap) => `${ORIGIN}/explicit-${sitemap}.xml`);
      siteFiles[ROBOTS_URL] = declared.map((sitemap) => `Sitemap: ${sitemap}`).join('\n');
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls });

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, ...sitemapUrls, ...declared.slice(0, 3)]);
    });

    it('crawls the pages they list on every site the crawl starts from, and on no other site', async () => {
      const sitemapUrl = 'https://cdn.example.net/sitemaps/all.xml';
      siteFiles[sitemapUrl] = toSitemap([
        `${ORIGIN}/listed-a`,
        `${OTHER_ORIGIN}/listed-b`,
        'https://other.net/listed-c',
        'https://www.docs.example.org/listed-d',
        'https://cdn.example.net/listed-e',
        'https://sub.example.com/listed-f',
      ]);
      mockPages(() => pageLinkingTo([]));

      await expect(
        crawl({ additionalSeedUrls: [OTHER_SEED_URL], sitemapUrls: [sitemapUrl] })
      ).resolves.toEqual(toResult({ documentsCount: 5 }));

      expect(getPageRequests()).toEqual([
        SEED_URL,
        OTHER_SEED_URL,
        `${ORIGIN}/listed-a`,
        `${OTHER_ORIGIN}/listed-b`,
        'https://www.docs.example.org/listed-d',
      ]);
    });

    it('applies the robots.txt of each site and the path rules to the pages they list', async () => {
      siteFiles[ROBOTS_URL] = disallow('/private');
      siteFiles[OTHER_ROBOTS_URL] = disallow('/internal');
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([
        `${ORIGIN}/private/a`,
        `${ORIGIN}/internal/a`,
        `${OTHER_ORIGIN}/private/b`,
        `${OTHER_ORIGIN}/internal/b`,
        `${ORIGIN}/blog/a`,
      ]);
      mockPages(() => pageLinkingTo([]));

      await expect(
        crawl({
          additionalSeedUrls: [OTHER_SEED_URL],
          sitemapUrls: [EXPLICIT_SITEMAP_URL],
          pathRules: { includePaths: [], excludePaths: ['/blog'] },
        })
      ).resolves.toEqual(
        toResult({ documentsCount: 4, skippedByRobotsCount: 2, skippedByRulesCount: 1 })
      );

      expect(getPageRequests()).toEqual([
        SEED_URL,
        OTHER_SEED_URL,
        `${ORIGIN}/internal/a`,
        `${OTHER_ORIGIN}/private/b`,
      ]);
    });
  });

  describe('ordering and concurrency', () => {
    const getLargeSitePage = (url: string): ExtractedPage => {
      const { pathname } = new URL(url);
      const prefix = pathname === '/' ? '' : pathname;
      return pageLinkingTo(range(12, (page) => `${prefix}/p${page}`));
    };

    const trackConcurrentExtractions = () => {
      let activeCount = 0;
      let maxActiveCount = 0;
      mockPages(async (url) => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);
        await flushPromises();
        activeCount--;
        return getLargeSitePage(url);
      });
      return () => maxActiveCount;
    };

    it('takes the shallowest page that is waiting before any deeper one', async () => {
      const depthOnePages = range(EXTRACTION_CONCURRENCY + 5, (page) => `${ORIGIN}/p${page}`);
      mockPages((url) => {
        const { pathname } = new URL(url);
        if (url === SEED_URL) {
          return pageLinkingTo(depthOnePages);
        }
        return pageLinkingTo(
          pathname.includes('/child-') ? [] : [`${pathname}/child-0`, `${pathname}/child-1`]
        );
      });

      await crawl();

      const requests = getPageRequests();
      const firstChildPosition = requests.findIndex((url) => url.includes('/child-'));
      expect(requests).toHaveLength(1 + depthOnePages.length * 3);
      expect(requests.slice(1, firstChildPosition)).toEqual(depthOnePages);
    });

    it(`extracts ${EXTRACTION_CONCURRENCY} pages at a time, and never more than the page budget`, async () => {
      const getMaxActiveCount = trackConcurrentExtractions();

      await expect(crawl({ maxDocuments: 150 })).resolves.toEqual(
        toResult({ documentsCount: 150 })
      );

      expect(getMaxActiveCount()).toBe(EXTRACTION_CONCURRENCY);

      const getMaxActiveCountOnSmallBudget = trackConcurrentExtractions();
      await crawl({ maxDocuments: 3 });

      expect(getMaxActiveCountOnSmallBudget()).toBeLessThanOrEqual(3);
    });

    it('stops extracting pages when indexing has fallen too far behind, and resumes after', async () => {
      const mostPagesBeforeStalling =
        1 +
        BULK_SIZE * (MAX_CONCURRENT_BULKS - 1) +
        BULK_SIZE * MAX_CONCURRENT_BULKS +
        EXTRACTION_CONCURRENCY;
      mockLargeSite(30, 20);
      const { succeed } = holdBulks();

      const crawling = crawl({ maxDocuments: 300 });
      await waitUntil(() => esClient.bulk.mock.calls.length === MAX_CONCURRENT_BULKS);
      await letCrawlRun();
      const requestCount = getPageRequests().length;
      await letCrawlRun();

      expect(getPageRequests()).toHaveLength(requestCount);
      expect(requestCount).toBeGreaterThanOrEqual(mostPagesBeforeStalling - EXTRACTION_CONCURRENCY);
      expect(requestCount).toBeLessThanOrEqual(mostPagesBeforeStalling);
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);

      succeed();

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 300 }));
      expect(getPageRequests()).toHaveLength(300);
    });
  });

  describe('page budget', () => {
    it('never requests more pages than the budget when many extractions finish together', async () => {
      const releasePages = range(12, (page) => hold(`${ORIGIN}/p${page}`));
      mockPages((url) => {
        const { pathname } = new URL(url);
        return pageLinkingTo(range(12, (page) => `${pathname === '/' ? '' : pathname}/p${page}`));
      });

      const crawling = crawl({ maxDocuments: EXTRACTION_CONCURRENCY + 4 });
      await waitUntil(() => getPageRequests().length === 1 + EXTRACTION_CONCURRENCY);
      await letCrawlRun();

      expect(getPageRequests()).toHaveLength(1 + EXTRACTION_CONCURRENCY);

      releasePages.forEach((release) => release());

      await expect(crawling).resolves.toEqual(
        toResult({ documentsCount: EXTRACTION_CONCURRENCY + 4 })
      );
      expect(getPageRequests()).toHaveLength(EXTRACTION_CONCURRENCY + 4);
    });

    it('counts the pages the sitemap lists against the budget, but not the robots.txt and sitemap requests', async () => {
      siteFiles[SITEMAP_URL] = toSitemap(range(60, (page) => `${ORIGIN}/from-sitemap-${page}`));
      mockPages((url) => pageLinkingTo(url === SEED_URL ? ['/a', '/b'] : []));

      await expect(crawl({ maxDocuments: 7 })).resolves.toEqual(toResult({ documentsCount: 7 }));

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/a`,
        `${ORIGIN}/b`,
        ...range(4, (page) => `${ORIGIN}/from-sitemap-${page}`),
      ]);
    });

    it('counts failed extractions against the budget', async () => {
      mockPages((url) => {
        if (url === SEED_URL) {
          return pageLinkingTo(range(150, (page) => `/page-${page}`));
        }
        throw new Error('extraction failed');
      });

      await expect(crawl({ maxDocuments: 120 })).resolves.toEqual(
        toResult({ documentsCount: 1, failedCount: 119 })
      );

      expect(getPageRequests()).toHaveLength(120);
    });
  });

  describe('progress', () => {
    const getReports = (onProgress: jest.Mock<void, [CrawlProgress]>): CrawlProgress[] =>
      onProgress.mock.calls.map(([progress]) => progress);

    it('counts the pages that failed without failing the crawl, and reports the counts as it advances', async () => {
      const onProgress = jest.fn<void, [CrawlProgress]>();
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/broken', '/empty', '/rejected']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/broken`]: new Error('extraction failed'),
        [`${ORIGIN}/empty`]: undefined,
        [`${ORIGIN}/rejected`]: pageLinkingTo([]),
      });
      mockBulk((id) => (id === sha256(`${ORIGIN}/rejected`) ? 'inference failed' : undefined));

      await expect(crawl({ onProgress })).resolves.toEqual(
        toResult({ documentsCount: 2, failedCount: 3 })
      );

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(`${ORIGIN}/broken`));
      const reports = getReports(onProgress);
      expect(reports.at(-1)).toEqual(
        toProgress({ documentsCount: 2, failedCount: 3, requestedCount: 5 })
      );
      reports.slice(1).forEach((report, position) => {
        const previous = reports[position];
        expect(report.documentsCount).toBeGreaterThanOrEqual(previous.documentsCount);
        expect(report.failedCount).toBeGreaterThanOrEqual(previous.failedCount);
        expect(report.requestedCount).toBeGreaterThanOrEqual(previous.requestedCount);
      });
    });

    it('reports the pages that are waiting, without those past the page budget', async () => {
      const onProgress = jest.fn<void, [CrawlProgress]>();
      mockLargeSite(30, 20);

      await crawl({ maxDocuments: 25, onProgress });

      const reports = getReports(onProgress);
      for (const { documentsCount, requestedCount, queuedCount } of reports) {
        expect(queuedCount).toBeGreaterThanOrEqual(0);
        expect(requestedCount + queuedCount).toBeLessThanOrEqual(25);
        expect(documentsCount).toBeLessThanOrEqual(requestedCount);
      }
      expect(reports[0].queuedCount).toBeGreaterThan(0);
      expect(reports.at(-1)).toEqual(toProgress({ documentsCount: 25, requestedCount: 25 }));
    });

    it('reports the pages that were requested before any of them is indexed', async () => {
      const onProgress = jest.fn<void, [CrawlProgress]>();
      mockSmallSite();
      const { succeed } = holdBulks();

      const crawling = crawl({ onProgress });
      await waitUntil(() => getPageRequests().length === 3);
      await letCrawlRun();

      expect(getReports(onProgress).at(-1)).toEqual(toProgress({ requestedCount: 3 }));

      succeed();
      await crawling;

      expect(getReports(onProgress).at(-1)).toEqual(
        toProgress({ documentsCount: 3, requestedCount: 3 })
      );
    });

    it('completes the crawl when the progress cannot be reported', async () => {
      mockSmallSite();

      await expect(
        crawl({
          onProgress: () => {
            throw new Error('progress unavailable');
          },
        })
      ).resolves.toEqual(toResult({ documentsCount: 3 }));
    });
  });

  describe('failures', () => {
    it('rejects with the extraction error when the start page cannot be extracted', async () => {
      mockSite({ [SEED_URL]: new Error('endpoint unavailable') });

      await expect(crawl()).rejects.toThrow('endpoint unavailable');
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('rejects with the indexing error when no page could be indexed', async () => {
      mockSmallSite();
      mockBulk(() => 'semantic_text inference failed');

      await expect(crawl()).rejects.toThrow('semantic_text inference failed');
    });

    it('rejects, stops crawling and aborts the in-flight requests when a bulk request throws during the crawl', async () => {
      mockPages((url) => {
        const { pathname } = new URL(url);
        return pageLinkingTo(range(20, (page) => `${pathname === '/' ? '' : pathname}/p${page}`));
      });
      esClient.bulk.mockRejectedValue(new Error('bulk unavailable'));

      await expect(crawl()).rejects.toThrow('bulk unavailable');

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(getPageRequests().length).toBeLessThanOrEqual(21);
      expect(getSignal(SEED_URL)?.aborted).toBe(true);
      expect(abortController.signal.aborted).toBe(false);
    });

    it('rejects when a bulk request throws while extraction is waiting for indexing', async () => {
      mockLargeSite(30, 20);
      const { fail } = holdBulks();

      const crawling = crawl({ maxDocuments: 300 });
      await waitUntil(() => esClient.bulk.mock.calls.length === MAX_CONCURRENT_BULKS);
      await letCrawlRun();
      const requestCount = getPageRequests().length;
      fail(new Error('bulk unavailable'));

      await expect(crawling).rejects.toThrow('bulk unavailable');
      expect(getPageRequests()).toHaveLength(requestCount);
    });
  });

  describe('crawl delay', () => {
    const { waitFor: actualWaitFor } = jest.requireActual<{ waitFor: typeof waitFor }>(
      './document_extraction'
    );

    const advance = async (delayMs: number) => {
      jest.advanceTimersByTime(delayMs);
      await letCrawlRun();
    };

    const mockFlatSite = () => mockSmallSite({ [SEED_URL]: pageLinkingTo(['/a', '/b']) });

    beforeEach(() => {
      // The helpers that let the crawl run wait on `setImmediate`, so that one stays real.
      jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
      mockWaitFor.mockImplementation(actualWaitFor);
    });

    afterEach(() => {
      mockWaitFor.mockReset();
      jest.useRealTimers();
    });

    it('spaces out the page requests of all workers by the Crawl-delay of robots.txt, without making robots.txt, the sitemap or the first page wait', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SITEMAP_URL, SEED_URL]);

      await advance(1_999);
      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(1_999);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(1);

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 3 }));
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`]);
    });

    it('paces the start URLs on the www. host and the bare host of a site together', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockPages(() => pageLinkingTo([]));

      const crawling = crawl({ additionalSeedUrls: ['https://www.example.com/'] });
      await letCrawlRun();

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(2_000);
      await crawling;

      expect(getPageRequests()).toEqual([SEED_URL, 'https://www.example.com/']);
    });

    it('does not make the pages of a site wait for the pause another site asked for', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockTwoSites();

      const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
      await letCrawlRun();

      expect(getPageRequests()).toEqual([OTHER_SEED_URL, SEED_URL, `${OTHER_ORIGIN}/b`]);

      await advance(2_000);

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 4 }));
    });

    it(`never waits longer than ${MAX_CRAWL_DELAY_MS}ms`, async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 60';
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(MAX_CRAWL_DELAY_MS - 1);

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(MAX_CRAWL_DELAY_MS);
      await crawling;
    });

    it('requests a page right away when the previous request was long enough ago', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      const releaseSeed = hold(SEED_URL);
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(5_000);
      releaseSeed();
      await letCrawlRun();

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(2_000);
      await crawling;
    });

    it('does not wait at all when robots.txt asks for no pause', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 0';
      mockFlatSite();

      await crawl();

      expect(getPageRequests()).toHaveLength(3);
      expect(mockWaitFor).not.toHaveBeenCalled();
    });

    it('stops waiting, and requests nothing more, when the signal is aborted during the wait', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(1_000);

      expect(jest.getTimerCount()).toBe(2);

      abortController.abort();

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 1, aborted: true }));
      expect(getPageRequests()).toEqual([SEED_URL]);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('stops waiting when a bulk request throws during the wait', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockFlatSite();
      const { fail } = holdBulks();

      const crawling = crawl();
      await letCrawlRun();
      await advance(1_000);
      fail(new Error('bulk unavailable'));

      await expect(crawling).rejects.toThrow('bulk unavailable');
      expect(getPageRequests()).toEqual([SEED_URL]);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('outdated pages', () => {
    it('deletes the pages of earlier crawls once the whole site was crawled and indexed', async () => {
      mockSmallSite();
      esClient.deleteByQuery.mockResolvedValue({ deleted: 7 });

      await expect(crawl({ maxDepth: 3 })).resolves.toEqual(
        toResult({ documentsCount: 3, purgedCount: 7 })
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: INDEX_NAME,
          conflicts: 'proceed',
          refresh: true,
          query: {
            bool: {
              filter: [
                { range: { depth: { lte: 3 } } },
                { terms: { url_host: ['example.com', 'www.example.com'] } },
              ],
              must_not: [{ term: { crawl_id: CRAWL_ID } }],
            },
          },
        },
        { signal: getSignal(SEED_URL) }
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('deletes only on the sites whose start URLs robots.txt allowed, each listed once', async () => {
      siteFiles['https://blog.example.net/robots.txt'] = disallow('/');
      mockPages((url) => pageLinkingTo(url === SEED_URL ? ['https://other.net/linked'] : []));

      await expect(
        crawl({
          additionalSeedUrls: [
            OTHER_SEED_URL,
            'https://www.example.com/docs',
            'https://blog.example.net/',
          ],
        })
      ).resolves.toEqual(toResult({ documentsCount: 3, skippedByRobotsCount: 1 }));

      expect(getPurgedHosts()).toEqual([
        'example.com',
        'www.example.com',
        'docs.example.org',
        'www.docs.example.org',
      ]);
    });

    it('deletes them only after every page was indexed', async () => {
      mockSmallSite();
      const { succeed } = holdBulks();

      const crawling = crawl();
      await waitUntil(() => getPageRequests().length === 3);
      await letCrawlRun();

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();

      succeed();
      await crawling;

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    });

    it('deletes them when the crawl stayed one page under the page limit and only skipped links', async () => {
      siteFiles[ROBOTS_URL] = disallow('/private');
      mockSmallSite({ [SEED_URL]: pageLinkingTo(['/a', '/b', '/private', '/blog']) });
      esClient.deleteByQuery.mockResolvedValue({ deleted: 2 });

      await expect(
        crawl({ maxDocuments: 4, pathRules: { includePaths: [], excludePaths: ['/blog'] } })
      ).resolves.toEqual(
        toResult({
          documentsCount: 3,
          skippedByRobotsCount: 1,
          skippedByRulesCount: 1,
          purgedCount: 2,
        })
      );
    });

    it('deletes only within the path rules of the crawl', async () => {
      mockSmallSite({ [SEED_URL]: pageLinkingTo(['/a', '/b', '/docs/internal']) });
      const pathRules = { includePaths: ['/a', '/b', '/docs'], excludePaths: ['/docs/internal'] };

      await crawl({ pathRules });

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      const [{ query }] = esClient.deleteByQuery.mock.calls[0];
      expect(query?.bool).toEqual({
        filter: [
          { range: { depth: { lte: WEB_CRAWL_DEFAULT_MAX_DEPTH } } },
          { terms: { url_host: ['example.com', 'www.example.com'] } },
          {
            bool: {
              should: pathRules.includePaths.map((prefix) => ({ prefix: { url_path: prefix } })),
              minimum_should_match: 1,
            },
          },
        ],
        must_not: [{ term: { crawl_id: CRAWL_ID } }, { prefix: { url_path: '/docs/internal' } }],
      });
    });

    it('deletes nothing when the URLs it remembers reached their limit', async () => {
      const linksPerPage = 10;
      const sections = ['/a', '/b', '/c'];
      const toSkippedLink = (pathname: string, link: number) => `/skipped${pathname}/${link}`;
      const skippedLinkLength = `${ORIGIN}${toSkippedLink(sections[0], 0)}`.length;
      jest.replaceProperty(
        CRAWL_LIMITS,
        'maxSeenUrlsLength',
        sections.join('').length + sections.length * ORIGIN.length + 15 * skippedLinkLength
      );
      mockPages((url) => {
        const { pathname } = new URL(url);
        return pageLinkingTo(
          pathname === '/' ? sections : range(linksPerPage, (link) => toSkippedLink(pathname, link))
        );
      });

      await expect(
        crawl({ pathRules: { includePaths: [], excludePaths: ['/skipped'] } })
      ).resolves.toEqual(toResult({ documentsCount: 4, skippedByRulesCount: 15 }));

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it.each<[string, () => void, Partial<CrawlOptions>]>([
      ['the crawl reached the page limit', () => mockSmallSite(), { maxDocuments: 3 }],
      [
        'a page had more links than the crawl reads from one page',
        () =>
          mockSmallSite({
            [`${ORIGIN}/b`]: pageLinkingTo(range(MAX_LINKS_PER_PAGE, (link) => `/skipped/${link}`)),
          }),
        { pathRules: { includePaths: [], excludePaths: ['/skipped'] } },
      ],
      [
        'the sitemaps listed more sitemaps than the crawl reads',
        () => {
          siteFiles[SITEMAP_URL] = `<sitemapindex>${range(
            4,
            (sitemap) => `<sitemap><loc>${ORIGIN}/sitemap-${sitemap}.xml</loc></sitemap>`
          ).join('')}</sitemapindex>`;
          mockSmallSite();
        },
        {},
      ],
      [
        'a page could not be extracted',
        () => mockSmallSite({ [`${ORIGIN}/b`]: new Error('extraction failed') }),
        {},
      ],
      ['a page had no content', () => mockSmallSite({ [`${ORIGIN}/b`]: undefined }), {}],
      [
        'the start page of one of the sites could not be extracted',
        () => mockTwoSites({ [OTHER_SEED_URL]: new Error('extraction failed') }),
        { additionalSeedUrls: [OTHER_SEED_URL] },
      ],
      [
        'Elasticsearch could not index a page',
        () => {
          mockSmallSite();
          mockBulk((id) => (id === sha256(`${ORIGIN}/b`) ? 'inference failed' : undefined));
        },
        {},
      ],
    ])('deletes nothing when %s', async (_, arrange, options) => {
      arrange();

      await expect(crawl(options)).resolves.toEqual(
        expect.objectContaining({ purgedCount: 0, aborted: false })
      );

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it.each<[string, () => void, string]>([
      [
        'no page was indexed',
        () => mockSmallSite({ [SEED_URL]: undefined }),
        `No content could be extracted from ${SEED_URL}`,
      ],
      [
        'a bulk request throws',
        () => {
          mockSmallSite();
          esClient.bulk.mockRejectedValue(new Error('bulk unavailable'));
        },
        'bulk unavailable',
      ],
    ])('rejects and deletes nothing when %s', async (_, arrange, message) => {
      arrange();

      await expect(crawl()).rejects.toThrow(message);

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when the signal is aborted during the crawl', async () => {
      hold(`${ORIGIN}/b`);
      mockSmallSite();

      const crawling = crawl();
      await waitUntil(() => getPageRequests().length === 3);
      await letCrawlRun();
      abortController.abort();

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 2, aborted: true }));
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('completes the crawl with a warning when the pages cannot be deleted', async () => {
      mockSmallSite();
      esClient.deleteByQuery.mockRejectedValue(new Error('delete forbidden'));

      await expect(crawl()).resolves.toEqual(toResult({ documentsCount: 3 }));

      expect(logger.warn).toHaveBeenCalledWith(
        `Web crawl of ${SEED_URL} could not remove outdated pages from ${INDEX_NAME}: delete forbidden`
      );
    });
  });

  describe('abort', () => {
    it('does not request or delete anything when the signal is already aborted', async () => {
      mockSmallSite();
      abortController.abort();

      await expect(crawl()).resolves.toEqual(toResult({ aborted: true }));

      expect(mockExtractPage).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('stops before the sitemap and the pages when the signal is aborted while reading robots.txt', async () => {
      mockExtractPage.mockImplementation(async () => {
        abortController.abort();
        throw new Error('Request aborted');
      });

      await expect(crawl()).resolves.toEqual(toResult({ aborted: true }));

      expect(getRequestedUrls()).toEqual([ROBOTS_URL]);
    });

    it('stops crawling when the signal is aborted during the crawl', async () => {
      mockPages((url) => {
        if (url === `${ORIGIN}/p2`) {
          abortController.abort();
        }
        return pageLinkingTo(
          url === SEED_URL ? range(50, (page) => `/p${page}`) : [`${new URL(url).pathname}/child`]
        );
      });

      await expect(crawl()).resolves.toEqual(
        expect.objectContaining({ failedCount: 0, aborted: true })
      );

      expect(getPageRequests().length).toBeLessThanOrEqual(1 + EXTRACTION_CONCURRENCY);
      expect(getPageRequests().some((url) => url.endsWith('/child'))).toBe(false);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('aborts the in-flight requests, and does not count the extraction it interrupted as a failure', async () => {
      const observed: boolean[] = [];
      mockPages((_, signal) => {
        observed.push(signal.aborted);
        abortController.abort();
        observed.push(signal.aborted);
        throw new Error('Request aborted');
      });

      await expect(crawl()).resolves.toEqual(toResult({ aborted: true }));

      expect(observed).toEqual([false, true]);
    });

    it('does not send the pages that were waiting to be indexed when the signal is aborted', async () => {
      hold(`${ORIGIN}/slow`);
      mockPages((url) =>
        pageLinkingTo(url === SEED_URL ? ['/p0', '/p1', '/p2', '/p3', '/slow'] : [])
      );
      const { succeed } = holdBulks();

      const crawling = crawl();
      await waitUntil(() => getPageRequests().length === 6);
      await letCrawlRun();
      abortController.abort();
      await letCrawlRun();
      succeed();

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 1, aborted: true }));
      expect(getIndexedDocuments().map(({ url }) => url)).toEqual([SEED_URL]);
    });

    it('stops when the signal is aborted while only the sitemap is still being read', async () => {
      hold(SITEMAP_URL);
      mockSite({ [SEED_URL]: pageLinkingTo([]) });

      const crawling = crawl();
      await waitUntil(() => getIndexedDocuments().length === 1);
      await letCrawlRun();
      abortController.abort();

      await expect(crawling).resolves.toEqual(toResult({ documentsCount: 1, aborted: true }));
    });

    it('stops reading the sitemap once the page budget is spent', async () => {
      hold(SITEMAP_URL);
      mockSmallSite();

      await expect(crawl({ maxDocuments: 2 })).resolves.toEqual(toResult({ documentsCount: 2 }));

      expect(getSignal(SITEMAP_URL)?.aborted).toBe(true);
    });

    it('gives the pages and the bulk requests one abort signal, and the sitemaps another that is aborted once the crawl is done', async () => {
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
      mockSmallSite();

      await crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] });

      const crawlSignal = getSignal(SEED_URL);
      expect(crawlSignal?.aborted).toBe(false);
      expect(getSignal(ROBOTS_URL)).toBe(crawlSignal);
      expect(getSignal(`${ORIGIN}/a`)).toBe(crawlSignal);
      for (const [, options] of esClient.bulk.mock.calls) {
        expect(options?.signal).toBe(crawlSignal);
      }
      expect(getSignal(SITEMAP_URL)).not.toBe(crawlSignal);
      expect(getSignal(SITEMAP_URL)?.aborted).toBe(true);
      expect(getSignal(EXPLICIT_SITEMAP_URL)).toBe(getSignal(SITEMAP_URL));
    });
  });

  describe('several start URLs', () => {
    const toSeedUrls = (count: number): string[] =>
      range(count, (seed) => `${ORIGIN}/start-${seed}`);

    describe('on one site', () => {
      it('crawls every start URL at depth 0, each once, and reads robots.txt and the sitemap once', async () => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/docs`, SEED_URL]);
        mockSite({
          [SEED_URL]: pageLinkingTo(['/docs', '/a']),
          [`${ORIGIN}/docs`]: pageLinkingTo(['/', '/docs/intro']),
          [`${ORIGIN}/a`]: pageLinkingTo(['/docs']),
          [`${ORIGIN}/docs/intro`]: pageLinkingTo([]),
        });

        await expect(
          crawl({ additionalSeedUrls: [`${ORIGIN}/docs`, SEED_URL, `${ORIGIN}/docs`] })
        ).resolves.toEqual(toResult({ documentsCount: 4 }));

        expect(getRequestedUrls()).toEqual([
          ROBOTS_URL,
          SITEMAP_URL,
          SEED_URL,
          `${ORIGIN}/docs`,
          `${ORIGIN}/a`,
          `${ORIGIN}/docs/intro`,
        ]);
        expect(getIndexedDepths()).toEqual({
          [SEED_URL]: 0,
          [`${ORIGIN}/docs`]: 0,
          [`${ORIGIN}/a`]: 1,
          [`${ORIGIN}/docs/intro`]: 1,
        });
      });

      it('treats the www. host and the bare host as one site, with one robots.txt', async () => {
        siteFiles[ROBOTS_URL] = disallow('/private');
        mockSite({
          [SEED_URL]: pageLinkingTo(['https://www.example.com/private/a', '/a']),
          [`${ORIGIN}/a`]: pageLinkingTo([]),
          'https://www.example.com/docs': pageLinkingTo([]),
        });

        await expect(
          crawl({
            additionalSeedUrls: [
              'https://www.example.com/private/start',
              'https://www.example.com/docs',
            ],
          })
        ).resolves.toEqual(toResult({ documentsCount: 3, skippedByRobotsCount: 2 }));

        expect(getRequestedUrls()).toEqual([
          ROBOTS_URL,
          SITEMAP_URL,
          SEED_URL,
          'https://www.example.com/docs',
          `${ORIGIN}/a`,
        ]);
      });

      it('requests the start URLs in the order given, up to the page limit, and finishes', async () => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockPages(() => pageLinkingTo(['/linked']));

        await expect(
          crawl({ additionalSeedUrls: toSeedUrls(4), maxDocuments: 3 })
        ).resolves.toEqual(toResult({ documentsCount: 3 }));

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/start-0`, `${ORIGIN}/start-1`]);
      });

      it('crawls every start URL before any page they link to, when there are more of them than workers', async () => {
        const seedUrls = [SEED_URL, ...toSeedUrls(EXTRACTION_CONCURRENCY + 2)];
        mockPages((url) =>
          pageLinkingTo(seedUrls.includes(url) ? [`/child${new URL(url).pathname}`] : [])
        );

        await expect(crawl({ additionalSeedUrls: seedUrls.slice(1) })).resolves.toEqual(
          toResult({ documentsCount: 2 * seedUrls.length })
        );

        expect(getPageRequests().slice(0, seedUrls.length)).toEqual(seedUrls);
      });
    });

    describe('on several sites', () => {
      it('crawls every site from its start URL into the one index', async () => {
        mockTwoSites();

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual(
          toResult({ documentsCount: 4 })
        );

        expect(getRequestedUrls()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          SITEMAP_URL,
          OTHER_SITEMAP_URL,
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/a`,
          `${OTHER_ORIGIN}/b`,
        ]);
        expect(getIndexedDocuments()).toEqual([
          expect.objectContaining({ url: SEED_URL, depth: 0, url_host: 'example.com' }),
          expect.objectContaining({ url: OTHER_SEED_URL, depth: 0, url_host: 'docs.example.org' }),
          expect.objectContaining({ url: `${ORIGIN}/a`, depth: 1, url_host: 'example.com' }),
          expect.objectContaining({
            url: `${OTHER_ORIGIN}/b`,
            depth: 1,
            url_host: 'docs.example.org',
          }),
        ]);
      });

      it('reads the robots.txt of every site at the same time, and nothing else until all are in', async () => {
        const releaseRobots = hold(ROBOTS_URL);
        mockTwoSites();

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        expect(getRequestedUrls()).toEqual([ROBOTS_URL, OTHER_ROBOTS_URL]);

        releaseRobots();
        await crawling;

        expect(getPageRequests()).toHaveLength(4);
      });

      it('applies the robots.txt of each site to the pages of that site only', async () => {
        siteFiles[ROBOTS_URL] = disallow('/private');
        siteFiles[OTHER_ROBOTS_URL] = disallow('/internal');
        mockPages((url) =>
          pageLinkingTo(url === SEED_URL || url === OTHER_SEED_URL ? ['/private', '/internal'] : [])
        );

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual(
          toResult({ documentsCount: 4, skippedByRobotsCount: 2 })
        );

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/internal`,
          `${OTHER_ORIGIN}/private`,
        ]);
      });

      it('does not follow a link from one site to another, even to a site the crawl also starts from', async () => {
        mockSite({
          [SEED_URL]: pageLinkingTo([`${OTHER_ORIGIN}/from-a`, 'https://other.net/', '/a']),
          [`${ORIGIN}/a`]: pageLinkingTo([OTHER_SEED_URL, `${OTHER_ORIGIN}/from-a`]),
          [OTHER_SEED_URL]: pageLinkingTo([`${ORIGIN}/from-b`, 'https://other.net/', '/b']),
          [`${OTHER_ORIGIN}/b`]: pageLinkingTo([SEED_URL, `${ORIGIN}/from-b`]),
          [`${OTHER_ORIGIN}/from-a`]: pageLinkingTo([]),
          [`${ORIGIN}/from-b`]: pageLinkingTo([]),
          'https://other.net/': pageLinkingTo([]),
        });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual(
          toResult({ documentsCount: 4 })
        );

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/a`,
          `${OTHER_ORIGIN}/b`,
        ]);
      });

      it('queues the sitemap pages only once every start page was crawled', async () => {
        const releaseOtherSeed = hold(OTHER_SEED_URL);
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockTwoSites({ [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]) });

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL, `${ORIGIN}/a`]);

        releaseOtherSeed();
        await crawling;

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/a`,
          `${OTHER_ORIGIN}/b`,
          `${ORIGIN}/from-sitemap`,
        ]);
      });

      it('completes, and queues the sitemap pages, when one of the start pages cannot be extracted', async () => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockTwoSites({
          [OTHER_SEED_URL]: new Error('extraction failed'),
          [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]),
        });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual(
          toResult({ documentsCount: 3, failedCount: 1 })
        );

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/a`,
          `${ORIGIN}/from-sitemap`,
        ]);
      });

      it('reads the sitemaps each site declares, or its /sitemap.xml, and keeps only the pages of that site', async () => {
        siteFiles[ROBOTS_URL] = `User-agent: *\nSitemap: ${ORIGIN}/sitemaps/pages.xml`;
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/not-declared`]);
        siteFiles[`${ORIGIN}/sitemaps/pages.xml`] = toSitemap([
          `${ORIGIN}/from-declared`,
          `${OTHER_ORIGIN}/listed-by-a`,
        ]);
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([
          `${OTHER_ORIGIN}/from-default`,
          `${ORIGIN}/listed-by-b`,
        ]);
        mockPages(() => pageLinkingTo([]));

        await crawl({ additionalSeedUrls: [OTHER_SEED_URL] });

        expect(getSiteFileRequests()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          `${ORIGIN}/sitemaps/pages.xml`,
          OTHER_SITEMAP_URL,
        ]);
        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/from-declared`,
          `${OTHER_ORIGIN}/from-default`,
        ]);
      });
    });

    describe('start URLs that robots.txt disallows', () => {
      it('drops the start URL of a site that disallows it, and still crawls the pages its sitemap lists that are allowed', async () => {
        const onProgress = jest.fn<void, [CrawlProgress]>();
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /\nAllow: /public';
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([
          `${OTHER_ORIGIN}/guide`,
          `${OTHER_ORIGIN}/public/page`,
        ]);
        mockTwoSites({ [`${OTHER_ORIGIN}/public/page`]: pageLinkingTo([]) });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL], onProgress })).resolves.toEqual(
          toResult({ documentsCount: 3, skippedByRobotsCount: 2 })
        );

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${OTHER_ORIGIN}/public/page`]);
        expect(getIndexedDepths()[`${OTHER_ORIGIN}/public/page`]).toBe(1);
        expect(onProgress.mock.calls[0][0].skippedByRobotsCount).toBe(1);
      });

      it('drops the URL the crawl was started with when other start URLs are allowed, and still reads the sitemap of its site', async () => {
        siteFiles[ROBOTS_URL] = disallow('/private/');
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockPages(() => pageLinkingTo([]));

        await expect(
          crawl({
            url: `${ORIGIN}/private/start`,
            additionalSeedUrls: [`${ORIGIN}/docs`, OTHER_SEED_URL],
          })
        ).resolves.toEqual(toResult({ documentsCount: 3, skippedByRobotsCount: 1 }));

        expect(getIndexedDepths()).toEqual({
          [`${ORIGIN}/docs`]: 0,
          [OTHER_SEED_URL]: 0,
          [`${ORIGIN}/from-sitemap`]: 1,
        });
      });

      it('counts every dropped start URL once, also when pages link to it afterwards, and does not spend the page budget on it', async () => {
        siteFiles[ROBOTS_URL] = disallow('/private');
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/private/1`, `${ORIGIN}/private/2`]);
        mockSite({
          [SEED_URL]: pageLinkingTo(['/private/1', '/private/3', '/a']),
          [`${ORIGIN}/a`]: pageLinkingTo(['/private/2', '/private/3']),
        });

        await expect(
          crawl({
            additionalSeedUrls: [`${ORIGIN}/private/1`, `${ORIGIN}/private/2`],
            maxDocuments: 3,
          })
        ).resolves.toEqual(toResult({ documentsCount: 2, skippedByRobotsCount: 3 }));

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);
      });

      it('rejects without requesting any page when robots.txt disallows every start URL', async () => {
        siteFiles[ROBOTS_URL] = disallow('/');
        siteFiles[OTHER_ROBOTS_URL] = disallow('/');
        mockTwoSites();

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).rejects.toThrow(
          new Error(NO_START_URL_ALLOWED)
        );

        expect(getRequestedUrls()).toEqual([ROBOTS_URL, OTHER_ROBOTS_URL]);
        expect(esClient.bulk).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      });
    });
  });
});
