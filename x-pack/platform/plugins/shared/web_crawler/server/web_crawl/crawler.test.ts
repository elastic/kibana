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
  WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
  WEB_CRAWL_MAX_SITEMAP_URLS,
} from '../../common/constants';
import { BULK_SIZE, MAX_CONCURRENT_BULKS } from './bulk_indexer';
import type { CrawlProgress } from './crawler';
import {
  EXTRACTION_CONCURRENCY,
  MAX_CRAWL_DELAY_MS,
  ROBOTS_USER_AGENT,
  crawlSite,
} from './crawler';
import type { ExtractedPage } from './document_extraction';
import { extractPage, waitFor } from './document_extraction';
import type { PathRules } from './path_rules';

jest.mock('./document_extraction');

const mockExtractPage = extractPage as jest.MockedFunction<typeof extractPage>;
const mockWaitFor = waitFor as jest.MockedFunction<typeof waitFor>;

const ORIGIN = 'https://example.com';
const SEED_URL = `${ORIGIN}/`;
const ROBOTS_URL = `${ORIGIN}/robots.txt`;
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;
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
  description?: string;
  content: string;
  depth: number;
  crawl_id: string;
  crawled_at: string;
  url_host: string;
  url_path: string;
  url_path_dir1?: string;
  url_path_dir2?: string;
  url_path_dir3?: string;
}

interface BulkBatch {
  ids: string[];
  documents: IndexedDocument[];
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const pageLinkingTo = (links: string[], overrides: Partial<ExtractedPage> = {}): ExtractedPage => ({
  content: links.length > 0 ? links.map((link) => `[link](${link})`).join('\n') : 'No links here',
  ...overrides,
});

const toSitemap = (locations: string[]): string =>
  `<urlset>${locations.map((location) => `<url><loc>${location}</loc></url>`).join('')}</urlset>`;

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

  const mockChainSite = () => {
    mockPages((url) => {
      const { pathname } = new URL(url);
      const depth = pathname === '/' ? 0 : Number(pathname.replace('/depth-', ''));
      return pageLinkingTo([`/depth-${depth + 1}`]);
    });
  };

  const mockLargeSite = (sectionCount: number, pagesPerSection: number) => {
    mockPages((url) => {
      const { pathname } = new URL(url);
      if (pathname === '/') {
        return pageLinkingTo(
          Array.from({ length: sectionCount }, (unused, section) => `/section-${section}`)
        );
      }
      return pageLinkingTo(
        Array.from({ length: pagesPerSection }, (unused, page) => `${pathname}/page-${page}`)
      );
    });
  };

  const toBulkResponse = (
    operations: readonly unknown[],
    getError: (id: string) => string | undefined = () => undefined
  ) => {
    const ids = operations
      .filter((_, position) => position % 2 === 0)
      .map((operation) => (operation as { index: { _id: string } }).index._id);
    const items = ids.map((id) => {
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

  const getBulkBatches = (): BulkBatch[] =>
    esClient.bulk.mock.calls.map(([params]) => {
      const operations = params?.operations ?? [];
      return {
        ids: operations
          .filter((_, position) => position % 2 === 0)
          .map((operation) => (operation as { index: { _id: string } }).index._id),
        documents: operations
          .filter((_, position) => position % 2 === 1)
          .map((operation) => operation as IndexedDocument),
      };
    });

  const getIndexedDocuments = (): IndexedDocument[] =>
    getBulkBatches().flatMap(({ documents }) => documents);

  const getRequestedUrls = (): string[] => mockExtractPage.mock.calls.map(([, { url }]) => url);

  const getPageRequests = (): string[] => getRequestedUrls().filter((url) => !isSiteFile(url));

  const getSiteFileRequests = (): string[] => getRequestedUrls().filter(isSiteFile);

  const getIndexedDepths = (): Record<string, number> =>
    Object.fromEntries(getIndexedDocuments().map(({ url, depth }) => [url, depth]));

  const crawl = ({
    url = SEED_URL,
    additionalSeedUrls,
    sitemapUrls,
    maxDepth = WEB_CRAWL_DEFAULT_MAX_DEPTH,
    maxDocuments = WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
    pathRules,
    onProgress,
  }: {
    url?: string;
    additionalSeedUrls?: string[];
    sitemapUrls?: string[];
    maxDepth?: number;
    maxDocuments?: number;
    pathRules?: PathRules;
    onProgress?: (progress: CrawlProgress) => void;
  } = {}) =>
    crawlSite({
      esClient,
      logger,
      signal: abortController.signal,
      url,
      additionalSeedUrls,
      sitemapUrls,
      indexName: INDEX_NAME,
      inferenceId: INFERENCE_ID,
      crawlId: CRAWL_ID,
      maxDepth,
      maxDocuments,
      pathRules,
      onProgress,
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
    it('extracts the seed page and the pages it links to, then indexes them', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo([`${ORIGIN}/a`, '/b'], {
          title: 'Home',
          description: 'The home page',
        }),
        [`${ORIGIN}/a`]: pageLinkingTo([], { title: 'A' }),
        [`${ORIGIN}/b`]: pageLinkingTo([], { title: 'B' }),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`]);
      for (const [client, options] of mockExtractPage.mock.calls) {
        expect(client).toBe(esClient);
        expect(options.inferenceId).toBe(INFERENCE_ID);
      }

      for (const [params] of esClient.bulk.mock.calls) {
        expect(params?.index).toBe(INDEX_NAME);
      }
      expect(getIndexedDocuments()).toEqual([
        {
          url: SEED_URL,
          title: 'Home',
          description: 'The home page',
          content: `[link](${ORIGIN}/a)\n[link](/b)`,
          depth: 0,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
          url_host: 'example.com',
          url_path: '/',
          url_path_dir1: undefined,
          url_path_dir2: undefined,
          url_path_dir3: undefined,
        },
        {
          url: `${ORIGIN}/a`,
          title: 'A',
          description: undefined,
          content: 'No links here',
          depth: 1,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
          url_host: 'example.com',
          url_path: '/a',
          url_path_dir1: 'a',
          url_path_dir2: undefined,
          url_path_dir3: undefined,
        },
        {
          url: `${ORIGIN}/b`,
          title: 'B',
          description: undefined,
          content: 'No links here',
          depth: 1,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
          url_host: 'example.com',
          url_path: '/b',
          url_path_dir1: 'b',
          url_path_dir2: undefined,
          url_path_dir3: undefined,
        },
      ]);
      for (const { crawled_at: crawledAt } of getIndexedDocuments()) {
        expect(new Date(crawledAt).toISOString()).toBe(crawledAt);
      }
    });

    it('reads robots.txt before it requests the sitemap and the seed page', async () => {
      const releaseRobots = hold(ROBOTS_URL);
      mockSite({ [`${ORIGIN}/docs/start?tab=1`]: pageLinkingTo([]) });

      const crawling = crawl({ url: `${ORIGIN}/docs/start?tab=1` });
      await letCrawlRun();

      expect(getRequestedUrls()).toEqual([ROBOTS_URL]);

      releaseRobots();
      await crawling;

      expect(getRequestedUrls()).toHaveLength(3);
      expect(getRequestedUrls().slice(1).sort()).toEqual(
        [SITEMAP_URL, `${ORIGIN}/docs/start?tab=1`].sort()
      );
    });

    it('uses the URL as title when the page has none', async () => {
      mockSite({ [SEED_URL]: pageLinkingTo([]) });

      await crawl();

      expect(getIndexedDocuments()).toEqual([expect.objectContaining({ title: SEED_URL })]);
    });

    it('does not follow links to other sites or to binary files', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['https://other.org/page', '/report.pdf', '/page']),
        [`${ORIGIN}/page`]: pageLinkingTo([]),
      });

      await crawl();

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/page`]);
    });

    it('truncates very large page content but still follows the links past the cut', async () => {
      const content = `${'a'.repeat(600_000)} [late](/late)`;
      mockSite({
        [SEED_URL]: { content },
        [`${ORIGIN}/late`]: pageLinkingTo([]),
      });

      await crawl();

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/late`]);
      expect(getIndexedDocuments()[0].content).toBe('a'.repeat(500_000));
    });

    it('indexes the host, the path and the first three directories of every page', async () => {
      mockSite({
        [`${ORIGIN}/docs`]: pageLinkingTo([
          '/docs/guide/intro?tab=1',
          'https://www.example.com/docs/guide/install/linux/arm',
        ]),
        [`${ORIGIN}/docs/guide/intro?tab=1`]: pageLinkingTo([]),
        [`https://www.example.com/docs/guide/install/linux/arm`]: pageLinkingTo([]),
      });

      await crawl({ url: `${ORIGIN}/docs` });

      expect(
        getIndexedDocuments().map(
          ({
            url,
            url_host: host,
            url_path: path,
            url_path_dir1: dir1,
            url_path_dir2: dir2,
            url_path_dir3: dir3,
          }) => ({ url, host, path, dir1, dir2, dir3 })
        )
      ).toEqual([
        {
          url: `${ORIGIN}/docs`,
          host: 'example.com',
          path: '/docs',
          dir1: 'docs',
          dir2: undefined,
          dir3: undefined,
        },
        {
          url: `${ORIGIN}/docs/guide/intro?tab=1`,
          host: 'example.com',
          path: '/docs/guide/intro',
          dir1: 'docs',
          dir2: 'guide',
          dir3: 'intro',
        },
        {
          url: 'https://www.example.com/docs/guide/install/linux/arm',
          host: 'www.example.com',
          path: '/docs/guide/install/linux/arm',
          dir1: 'docs',
          dir2: 'guide',
          dir3: 'install',
        },
      ]);
    });
  });

  describe('robots.txt', () => {
    it('selects its rules with the Elastic-Crawler user agent', () => {
      expect(ROBOTS_USER_AGENT).toBe('Elastic-Crawler');
    });

    it('rejects without requesting any page when the seed URL is disallowed', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /';
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
      mockSite({ [SEED_URL]: pageLinkingTo(['/a']) });

      await expect(crawl()).rejects.toThrow(
        `The site's robots.txt does not allow crawling ${SEED_URL}`
      );

      expect(getRequestedUrls()).toEqual([ROBOTS_URL]);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('rejects when only the path of the seed URL is disallowed', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private/';
      mockSite({ [`${ORIGIN}/private/start`]: pageLinkingTo([]) });

      await expect(crawl({ url: `${ORIGIN}/private/start` })).rejects.toThrow(/robots\.txt/);

      expect(getPageRequests()).toEqual([]);
    });

    it('stops following the task signal once it rejected the seed URL', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /';
      mockSite({});
      const removeEventListener = jest.spyOn(abortController.signal, 'removeEventListener');

      await expect(crawl()).rejects.toThrow(/robots\.txt/);

      expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('never requests the links that robots.txt disallows', async () => {
      siteFiles[ROBOTS_URL] = [
        'User-agent: *',
        'Disallow: /private',
        'Disallow: /*?session=',
        'Disallow: /drafts/*/preview$',
        'Allow: /private/press',
      ].join('\n');
      siteFiles[SITEMAP_URL] = toSitemap([
        `${ORIGIN}/private/from-sitemap`,
        `${ORIGIN}/sitemap-ok`,
      ]);
      mockSite({
        [SEED_URL]: pageLinkingTo([
          '/private/a',
          '/public',
          '/public?session=abc',
          '/private/press',
          '/drafts/one/preview',
          '/drafts/one/preview/notes',
        ]),
        [`${ORIGIN}/public`]: pageLinkingTo(['/private/b', '/deeper']),
        [`${ORIGIN}/private/press`]: pageLinkingTo([]),
        [`${ORIGIN}/drafts/one/preview/notes`]: pageLinkingTo([]),
        [`${ORIGIN}/sitemap-ok`]: pageLinkingTo(['/private/c']),
        [`${ORIGIN}/deeper`]: pageLinkingTo(['/private/d']),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 6,
        failedCount: 0,
        skippedByRobotsCount: 6,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests().sort()).toEqual(
        [
          SEED_URL,
          `${ORIGIN}/public`,
          `${ORIGIN}/private/press`,
          `${ORIGIN}/drafts/one/preview/notes`,
          `${ORIGIN}/sitemap-ok`,
          `${ORIGIN}/deeper`,
        ].sort()
      );
    });

    it('applies the Elastic-Crawler group rather than the `*` group when there is one', async () => {
      siteFiles[ROBOTS_URL] = [
        'User-agent: *',
        'Disallow: /',
        '',
        'User-agent: elastic-crawler',
        'Disallow: /private',
      ].join('\n');
      mockSite({
        [SEED_URL]: pageLinkingTo(['/private', '/public']),
        [`${ORIGIN}/public`]: pageLinkingTo([]),
      });

      await crawl();

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/public`]);
    });

    it('does not spend the page budget on disallowed links', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
      mockSite({
        [SEED_URL]: pageLinkingTo(['/private/a', '/private/b', '/private/c', '/x', '/y', '/z']),
        [`${ORIGIN}/x`]: pageLinkingTo([]),
        [`${ORIGIN}/y`]: pageLinkingTo([]),
        [`${ORIGIN}/z`]: pageLinkingTo([]),
      });

      await crawl({ maxDocuments: 3 });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/x`, `${ORIGIN}/y`]);
    });

    it.each([
      ['cannot be read', new Error('robots.txt unavailable')],
      ['has no content', undefined],
      ['is empty', ''],
      ['is an error page', '# 404\n\nPage not found. [Home](https://example.com/)'],
    ])('allows everything when robots.txt %s', async (_, robotsTxt) => {
      siteFiles[ROBOTS_URL] = robotsTxt;
      mockSite({
        [SEED_URL]: pageLinkingTo(['/private', '/admin?session=1']),
        [`${ORIGIN}/private`]: pageLinkingTo([]),
        [`${ORIGIN}/admin?session=1`]: pageLinkingTo([]),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/private`,
        `${ORIGIN}/admin?session=1`,
      ]);
    });

    it('reads robots.txt from the root of the site whatever the seed path', async () => {
      mockSite({ [`${ORIGIN}/docs/guide/intro`]: pageLinkingTo([]) });

      await crawl({ url: `${ORIGIN}/docs/guide/intro` });

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, SITEMAP_URL]);
    });
  });

  describe('sitemaps', () => {
    it('crawls the sitemap pages at depth 1, after the links of the seed page', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap-1`, `${ORIGIN}/from-sitemap-2`]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/linked-1', '/linked-2']),
        [`${ORIGIN}/linked-1`]: pageLinkingTo([]),
        [`${ORIGIN}/linked-2`]: pageLinkingTo([]),
        [`${ORIGIN}/from-sitemap-1`]: pageLinkingTo(['/below-sitemap']),
        [`${ORIGIN}/from-sitemap-2`]: pageLinkingTo([]),
        [`${ORIGIN}/below-sitemap`]: pageLinkingTo(['/too-deep']),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 6,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/linked-1`,
        `${ORIGIN}/linked-2`,
        `${ORIGIN}/from-sitemap-1`,
        `${ORIGIN}/from-sitemap-2`,
        `${ORIGIN}/below-sitemap`,
      ]);
      expect(
        Object.fromEntries(getIndexedDocuments().map(({ url, depth }) => [url, depth]))
      ).toEqual({
        [SEED_URL]: 0,
        [`${ORIGIN}/linked-1`]: 1,
        [`${ORIGIN}/linked-2`]: 1,
        [`${ORIGIN}/from-sitemap-1`]: 1,
        [`${ORIGIN}/from-sitemap-2`]: 1,
        [`${ORIGIN}/below-sitemap`]: 2,
      });
    });

    it('reads the sitemap while the seed page and the pages below it are crawled', async () => {
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

      expect(getRequestedUrls()).toEqual([
        ROBOTS_URL,
        SITEMAP_URL,
        SEED_URL,
        `${ORIGIN}/a`,
        `${ORIGIN}/b`,
      ]);

      releaseSitemap();

      await expect(crawling).resolves.toEqual({
        documentsCount: 4,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
      expect(getIndexedDocuments().at(-1)).toEqual(
        expect.objectContaining({ url: `${ORIGIN}/from-sitemap`, depth: 1 })
      );
    });

    it('queues the sitemap pages behind the links of the seed page, even when the sitemap is read first', async () => {
      const releaseSeed = hold(SEED_URL);
      const linkedPages = Array.from(
        { length: EXTRACTION_CONCURRENCY + 2 },
        (_, page) => `${ORIGIN}/linked-${page}`
      );
      const sitemapPages = [`${ORIGIN}/from-sitemap-1`, `${ORIGIN}/from-sitemap-2`];
      siteFiles[SITEMAP_URL] = toSitemap(sitemapPages);
      mockPages((url) => pageLinkingTo(url === SEED_URL ? linkedPages : []));

      const crawling = crawl();
      await letCrawlRun();

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SITEMAP_URL, SEED_URL]);

      releaseSeed();
      await crawling;

      expect(getPageRequests()).toEqual([SEED_URL, ...linkedPages, ...sitemapPages]);
    });

    it('crawls the sitemap pages when the seed page could not be extracted', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
      mockSite({
        [SEED_URL]: new Error('extraction failed'),
        [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 1,
        failedCount: 1,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('finishes when the sitemap comes back last and lists nothing new', async () => {
      const releaseSitemap = hold(SITEMAP_URL);
      siteFiles[SITEMAP_URL] = toSitemap([SEED_URL]);
      mockSite({ [SEED_URL]: pageLinkingTo([]) });

      const crawling = crawl();
      await waitUntil(() => getIndexedDocuments().length === 1);
      await letCrawlRun();
      releaseSitemap();

      await expect(crawling).resolves.toEqual({
        documentsCount: 1,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('dedupes the sitemap pages against the seed page and its links', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([
        SEED_URL,
        `${ORIGIN}/#top`,
        `${ORIGIN}/linked`,
        `${ORIGIN}/sitemap-only`,
        `${ORIGIN}/sitemap-only`,
      ]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/linked']),
        [`${ORIGIN}/linked`]: pageLinkingTo(['/sitemap-only']),
        [`${ORIGIN}/sitemap-only`]: pageLinkingTo([]),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/linked`, `${ORIGIN}/sitemap-only`]);
    });

    it('reads the sitemaps that robots.txt declares instead of /sitemap.xml', async () => {
      siteFiles[ROBOTS_URL] = [
        'User-agent: *',
        'Disallow: /private',
        `Sitemap: ${ORIGIN}/sitemaps/docs.xml`,
        'Sitemap: /sitemaps/blog.xml',
      ].join('\n');
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-default`]);
      siteFiles[`${ORIGIN}/sitemaps/docs.xml`] = toSitemap([`${ORIGIN}/docs/a`]);
      siteFiles[
        `${ORIGIN}/sitemaps/blog.xml`
      ] = `[${ORIGIN}/blog/a](${ORIGIN}/blog/a)  \n2024-12-05`;
      mockSite({
        [SEED_URL]: pageLinkingTo([]),
        [`${ORIGIN}/docs/a`]: pageLinkingTo([]),
        [`${ORIGIN}/blog/a`]: pageLinkingTo([]),
      });

      await crawl();

      expect(getSiteFileRequests()).toEqual([
        ROBOTS_URL,
        `${ORIGIN}/sitemaps/docs.xml`,
        `${ORIGIN}/sitemaps/blog.xml`,
      ]);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs/a`, `${ORIGIN}/blog/a`]);
    });

    it('never reads more than 3 sitemaps', async () => {
      siteFiles[SITEMAP_URL] = Array.from(
        { length: 8 },
        (_, index) => `<sitemap><loc>${ORIGIN}/sitemap-${index}.xml</loc></sitemap>`
      ).join('');
      for (let index = 0; index < 8; index++) {
        siteFiles[`${ORIGIN}/sitemap-${index}.xml`] = toSitemap([`${ORIGIN}/page-${index}`]);
      }
      mockPages(() => pageLinkingTo([]));

      await crawl();

      expect(getSiteFileRequests()).toEqual([
        ROBOTS_URL,
        SITEMAP_URL,
        `${ORIGIN}/sitemap-0.xml`,
        `${ORIGIN}/sitemap-1.xml`,
      ]);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/page-0`, `${ORIGIN}/page-1`]);
    });

    it('crawls the site without sitemap pages when the sitemap cannot be read', async () => {
      siteFiles[SITEMAP_URL] = new Error('sitemap unavailable');
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 2,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('does not read sitemaps when the maximum depth is 0', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/linked']),
        [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]),
      });

      await expect(crawl({ maxDepth: 0 })).resolves.toEqual({
        documentsCount: 1,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SEED_URL]);
    });

    it('does not read sitemaps when only one document may be crawled', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
      mockSite({ [SEED_URL]: pageLinkingTo(['/linked']) });

      await crawl({ maxDocuments: 1 });

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SEED_URL]);
    });

    it('does not request robots.txt again or index it when a page links to it', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nAllow: /';
      mockSite({
        [SEED_URL]: pageLinkingTo(['/robots.txt', `${ORIGIN}/robots.txt#top`, '/a']),
        [`${ORIGIN}/a`]: pageLinkingTo(['/robots.txt']),
      });

      await expect(crawl({ maxDocuments: 2 })).resolves.toEqual({
        documentsCount: 2,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getRequestedUrls().filter((url) => url === ROBOTS_URL)).toHaveLength(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);
      expect(getIndexedDocuments().map(({ url }) => url)).toEqual([SEED_URL, `${ORIGIN}/a`]);
    });

    it('does not request robots.txt again when the sitemap lists it', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([ROBOTS_URL, `${ORIGIN}/a`]);
      mockSite({
        [SEED_URL]: pageLinkingTo([]),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
      });

      await crawl();

      expect(getRequestedUrls().filter((url) => url === ROBOTS_URL)).toHaveLength(1);
      expect(getIndexedDocuments().map(({ url }) => url)).toEqual([SEED_URL, `${ORIGIN}/a`]);
    });

    it('does not index robots.txt or the sitemaps it read', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nAllow: /';
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/sitemap.xml']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
      });

      await crawl();

      expect(getIndexedDocuments().map(({ url }) => url)).toEqual([SEED_URL, `${ORIGIN}/a`]);
    });
  });

  describe('ordering', () => {
    it('crawls the pages below a page while a page next to it is still being extracted', async () => {
      const releaseSlow = hold(`${ORIGIN}/slow`);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/slow', '/fast']),
        [`${ORIGIN}/slow`]: pageLinkingTo([]),
        [`${ORIGIN}/fast`]: pageLinkingTo(['/deep']),
        [`${ORIGIN}/deep`]: pageLinkingTo([]),
      });

      const crawling = crawl();
      await waitUntil(() => getIndexedDocuments().some(({ url }) => url === `${ORIGIN}/deep`));

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/slow`,
        `${ORIGIN}/fast`,
        `${ORIGIN}/deep`,
      ]);
      expect(getIndexedDocuments().map(({ url }) => url)).not.toContain(`${ORIGIN}/slow`);

      releaseSlow();

      await expect(crawling).resolves.toEqual({
        documentsCount: 4,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('takes the shallowest page that is waiting before any deeper one', async () => {
      const depthOnePages = Array.from(
        { length: EXTRACTION_CONCURRENCY + 5 },
        (_, page) => `${ORIGIN}/p${page}`
      );
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

    it('takes a shallow page that was found late before the deeper pages that were already waiting', async () => {
      const releaseSitemap = hold(SITEMAP_URL);
      const firstPages = Array.from(
        { length: EXTRACTION_CONCURRENCY },
        (_, page) => `${ORIGIN}/p${page}`
      );
      const releaseFirstPages = firstPages.map(hold);
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
      mockPages((url) => {
        if (url === SEED_URL) {
          return pageLinkingTo(firstPages);
        }
        return pageLinkingTo(url === firstPages[0] ? ['/deep-0', '/deep-1'] : []);
      });

      const crawling = crawl();
      await waitUntil(() => getPageRequests().length === 1 + EXTRACTION_CONCURRENCY);
      releaseSitemap();
      await letCrawlRun();
      releaseFirstPages.forEach((release) => release());
      await crawling;

      expect(getPageRequests().slice(1 + EXTRACTION_CONCURRENCY)).toEqual([
        `${ORIGIN}/from-sitemap`,
        `${ORIGIN}/deep-0`,
        `${ORIGIN}/deep-1`,
      ]);
    });
  });

  describe('concurrency', () => {
    const trackConcurrentExtractions = (getPage: (url: string) => ExtractedPage) => {
      let activeCount = 0;
      let maxActiveCount = 0;
      mockPages(async (url) => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);
        await flushPromises();
        activeCount--;
        return getPage(url);
      });
      return () => maxActiveCount;
    };

    const getLargeSitePage = (url: string): ExtractedPage => {
      const { pathname } = new URL(url);
      const prefix = pathname === '/' ? '' : pathname;
      return pageLinkingTo(Array.from({ length: 12 }, (unused, page) => `${prefix}/p${page}`));
    };

    it(`extracts ${EXTRACTION_CONCURRENCY} pages at a time on a site with plenty of pages`, async () => {
      const getMaxActiveCount = trackConcurrentExtractions(getLargeSitePage);

      await expect(crawl({ maxDocuments: 150 })).resolves.toEqual({
        documentsCount: 150,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getMaxActiveCount()).toBe(EXTRACTION_CONCURRENCY);
    });

    it('never extracts more pages at a time than the page budget', async () => {
      const getMaxActiveCount = trackConcurrentExtractions(getLargeSitePage);

      await crawl({ maxDocuments: 3 });

      expect(getPageRequests()).toHaveLength(3);
      expect(getMaxActiveCount()).toBeLessThanOrEqual(3);
    });

    it('never requests more pages than the budget when many extractions finish together', async () => {
      const releasePages = Array.from({ length: 12 }, (_, page) => hold(`${ORIGIN}/p${page}`));
      mockPages(getLargeSitePage);

      const crawling = crawl({ maxDocuments: EXTRACTION_CONCURRENCY + 4 });
      await waitUntil(() => getPageRequests().length === 1 + EXTRACTION_CONCURRENCY);
      await letCrawlRun();

      expect(getPageRequests()).toHaveLength(1 + EXTRACTION_CONCURRENCY);

      releasePages.forEach((release) => release());

      await expect(crawling).resolves.toEqual({
        documentsCount: EXTRACTION_CONCURRENCY + 4,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
      expect(getPageRequests()).toHaveLength(EXTRACTION_CONCURRENCY + 4);
    });
  });

  describe('progress', () => {
    const getReports = (onProgress: jest.Mock<void, [CrawlProgress]>): CrawlProgress[] =>
      onProgress.mock.calls.map(([progress]) => progress);

    it('reports the counts as the crawl advances, ending with the final ones', async () => {
      const onProgress = jest.fn<void, [CrawlProgress]>();
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/broken', '/empty', '/rejected']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/broken`]: new Error('extraction failed'),
        [`${ORIGIN}/empty`]: undefined,
        [`${ORIGIN}/rejected`]: pageLinkingTo([]),
      });
      mockBulk((id) => (id === sha256(`${ORIGIN}/rejected`) ? 'inference failed' : undefined));

      await expect(crawl({ onProgress })).resolves.toEqual({
        documentsCount: 2,
        failedCount: 3,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      const reports = getReports(onProgress);
      expect(reports.at(-1)).toEqual({
        documentsCount: 2,
        failedCount: 3,
        requestedCount: 5,
        queuedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
      });
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
      expect(reports.at(-1)).toEqual({
        documentsCount: 25,
        failedCount: 0,
        requestedCount: 25,
        queuedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
      });
    });

    it('reports the pages that were requested before any of them is indexed', async () => {
      const onProgress = jest.fn<void, [CrawlProgress]>();
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/b']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/b`]: pageLinkingTo([]),
      });
      const { succeed } = holdBulks();

      const crawling = crawl({ onProgress });
      await waitUntil(() => getPageRequests().length === 3);
      await letCrawlRun();

      expect(getReports(onProgress).at(-1)).toEqual({
        documentsCount: 0,
        failedCount: 0,
        requestedCount: 3,
        queuedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
      });

      succeed();
      await crawling;

      expect(getReports(onProgress).at(-1)).toEqual({
        documentsCount: 3,
        failedCount: 0,
        requestedCount: 3,
        queuedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
      });
    });
  });

  describe('depth limit', () => {
    it('does not follow the links found on pages at the maximum depth', async () => {
      mockChainSite();

      await expect(crawl()).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/depth-1`, `${ORIGIN}/depth-2`]);
      expect(getIndexedDocuments().map(({ url, depth }) => ({ url, depth }))).toEqual([
        { url: SEED_URL, depth: 0 },
        { url: `${ORIGIN}/depth-1`, depth: 1 },
        { url: `${ORIGIN}/depth-2`, depth: 2 },
      ]);
    });

    it.each([0, 1, 2, 3, 5])(
      'crawls pages up to %i links away from the seed page',
      async (maxDepth) => {
        mockChainSite();

        await expect(crawl({ maxDepth })).resolves.toEqual({
          documentsCount: maxDepth + 1,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([
          SEED_URL,
          ...Array.from({ length: maxDepth }, (_, index) => `${ORIGIN}/depth-${index + 1}`),
        ]);
        expect(Math.max(...getIndexedDocuments().map(({ depth }) => depth))).toBe(maxDepth);
      }
    );

    it('only crawls the seed page at depth 0, whatever it links to', async () => {
      mockLargeSite(50, 10);

      await crawl({ maxDepth: 0 });

      expect(getPageRequests()).toEqual([SEED_URL]);
    });

    it('records the shortest depth at which a page was found', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/b']),
        [`${ORIGIN}/a`]: pageLinkingTo(['/b', '/c']),
        [`${ORIGIN}/b`]: pageLinkingTo(['/c']),
        [`${ORIGIN}/c`]: pageLinkingTo([]),
      });

      await crawl();

      expect(
        Object.fromEntries(getIndexedDocuments().map(({ url, depth }) => [url, depth]))
      ).toEqual({
        [SEED_URL]: 0,
        [`${ORIGIN}/a`]: 1,
        [`${ORIGIN}/b`]: 1,
        [`${ORIGIN}/c`]: 2,
      });
    });
  });

  describe('page budget', () => {
    it.each([1, 7, 25, WEB_CRAWL_DEFAULT_MAX_DOCUMENTS, WEB_CRAWL_MAX_DOCUMENTS_LIMIT])(
      'requests exactly %i pages of a site that has far more',
      async (maxDocuments) => {
        mockLargeSite(30, 100);

        await expect(crawl({ maxDocuments })).resolves.toEqual({
          documentsCount: maxDocuments,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        const pageRequests = getPageRequests();
        expect(pageRequests).toHaveLength(maxDocuments);
        expect(new Set(pageRequests).size).toBe(maxDocuments);
        expect(getIndexedDocuments()).toHaveLength(maxDocuments);
      }
    );

    it.each([1, 3, 5])(
      'respects a budget of 40 pages at a maximum depth of %i',
      async (maxDepth) => {
        mockLargeSite(6, 6);

        const { documentsCount } = await crawl({ maxDepth, maxDocuments: 40 });

        const expectedCount = maxDepth === 1 ? 7 : 40;
        expect(documentsCount).toBe(expectedCount);
        expect(getPageRequests()).toHaveLength(expectedCount);
        expect(Math.max(...getIndexedDocuments().map(({ depth }) => depth))).toBeLessThanOrEqual(
          maxDepth
        );
      }
    );

    it('never requests more than the maximum number of pages when one page links to more', async () => {
      mockLargeSite(WEB_CRAWL_DEFAULT_MAX_DOCUMENTS + 250, 3);

      await expect(crawl()).resolves.toEqual({
        documentsCount: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toHaveLength(WEB_CRAWL_DEFAULT_MAX_DOCUMENTS);
      expect(getIndexedDocuments().every(({ depth }) => depth <= 1)).toBe(true);
    });

    it('never requests more than the maximum number of pages when the sitemap lists more', async () => {
      siteFiles[SITEMAP_URL] = toSitemap(
        Array.from({ length: 60 }, (_, index) => `${ORIGIN}/from-sitemap-${index}`)
      );
      mockPages((url) => (url === SEED_URL ? pageLinkingTo(['/a', '/b']) : pageLinkingTo([])));

      await expect(crawl({ maxDocuments: 7 })).resolves.toEqual({
        documentsCount: 7,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/a`,
        `${ORIGIN}/b`,
        ...Array.from({ length: 4 }, (_, index) => `${ORIGIN}/from-sitemap-${index}`),
      ]);
    });

    it('does not count the robots.txt and sitemap requests against the budget', async () => {
      siteFiles[ROBOTS_URL] = [
        'User-agent: *',
        'Disallow: /private',
        `Sitemap: ${ORIGIN}/sitemap-index.xml`,
      ].join('\n');
      siteFiles[`${ORIGIN}/sitemap-index.xml`] = [
        `<sitemap><loc>${ORIGIN}/sitemap-a.xml</loc></sitemap>`,
        `<sitemap><loc>${ORIGIN}/sitemap-b.xml</loc></sitemap>`,
      ].join('');
      siteFiles[`${ORIGIN}/sitemap-a.xml`] = toSitemap([`${ORIGIN}/a`]);
      siteFiles[`${ORIGIN}/sitemap-b.xml`] = toSitemap([`${ORIGIN}/b`]);
      mockPages((url) => (url === SEED_URL ? pageLinkingTo(['/linked']) : pageLinkingTo([])));

      await expect(crawl({ maxDocuments: 4 })).resolves.toEqual({
        documentsCount: 4,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getSiteFileRequests()).toHaveLength(4);
      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/linked`,
        `${ORIGIN}/a`,
        `${ORIGIN}/b`,
      ]);
      expect(mockExtractPage).toHaveBeenCalledTimes(8);
    });

    it('counts failed extractions against the budget', async () => {
      mockPages((url) => {
        if (url === SEED_URL) {
          return pageLinkingTo(Array.from({ length: 800 }, (unused, page) => `/page-${page}`));
        }
        throw new Error('extraction failed');
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 1,
        failedCount: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS - 1,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toHaveLength(WEB_CRAWL_DEFAULT_MAX_DOCUMENTS);
    });
  });

  describe('deduplication', () => {
    it('never fetches a URL twice on a site with cyclic and repeated links', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/', '/a', '/a', '/a#section', '/b', `${ORIGIN}/#top`]),
        [`${ORIGIN}/a`]: pageLinkingTo(['/', '/a', '/b', '/c', 'https://user:pw@example.com/b']),
        [`${ORIGIN}/b`]: pageLinkingTo(['/a', '/c#one', '/c#two', '/']),
        [`${ORIGIN}/c`]: pageLinkingTo(['/', '/a', '/b', '/c']),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 4,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      const requestedUrls = getRequestedUrls();
      expect(new Set(requestedUrls).size).toBe(requestedUrls.length);
      expect(getPageRequests().sort()).toEqual(
        [SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`, `${ORIGIN}/c`].sort()
      );
      const indexedIds = getBulkBatches().flatMap(({ ids }) => ids);
      expect(new Set(indexedIds).size).toBe(indexedIds.length);
    });

    it('does not retry a page whose extraction failed', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/broken', '/a']),
        [`${ORIGIN}/broken`]: new Error('extraction failed'),
        [`${ORIGIN}/a`]: pageLinkingTo(['/broken']),
      });

      await crawl();

      expect(getPageRequests().filter((url) => url === `${ORIGIN}/broken`)).toHaveLength(1);
    });
  });

  describe('indexing', () => {
    const mockFlatSite = (pageCount: number) => {
      const site: Site = {
        [SEED_URL]: pageLinkingTo(Array.from({ length: pageCount - 1 }, (_, page) => `/p${page}`)),
      };
      for (let page = 0; page < pageCount - 1; page++) {
        site[`${ORIGIN}/p${page}`] = pageLinkingTo([]);
      }
      mockSite(site);
    };

    it('indexes the pages in several small bulk requests', async () => {
      mockFlatSite(47);

      await expect(crawl()).resolves.toEqual({
        documentsCount: 47,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      const batches = getBulkBatches();
      expect(batches.length).toBeGreaterThanOrEqual(Math.ceil(47 / BULK_SIZE));
      for (const { ids, documents } of batches) {
        expect(ids).toHaveLength(documents.length);
        expect(documents.length).toBeGreaterThan(0);
        expect(documents.length).toBeLessThanOrEqual(BULK_SIZE);
      }
      const indexedUrls = batches.flatMap(({ documents }) => documents.map(({ url }) => url));
      expect(indexedUrls).toHaveLength(47);
      expect(new Set(indexedUrls).size).toBe(47);
      for (const [params] of esClient.bulk.mock.calls) {
        expect(params?.index).toBe(INDEX_NAME);
      }
    });

    it('indexes the seed page right away and the pages left over once the crawl is done', async () => {
      mockFlatSite(3);

      await crawl();

      expect(getBulkBatches().map(({ documents }) => documents.length)).toEqual([1, 2]);
    });

    it('keeps extracting pages while bulk requests are in flight', async () => {
      mockFlatSite(BULK_SIZE + 10);
      const { succeed } = holdBulks();

      const crawling = crawl();
      await waitUntil(() => getPageRequests().length === BULK_SIZE + 10);
      await letCrawlRun();
      let isDone = false;
      void crawling.then(() => {
        isDone = true;
      });
      await letCrawlRun();

      expect(isDone).toBe(false);

      succeed();

      await expect(crawling).resolves.toEqual({
        documentsCount: BULK_SIZE + 10,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
      expect(getBulkBatches().map(({ documents }) => documents.length)).toEqual([1, BULK_SIZE, 9]);
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

      await expect(crawling).resolves.toEqual({
        documentsCount: 300,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
      expect(getPageRequests()).toHaveLength(300);
    });

    it('derives a stable document ID from the page URL', async () => {
      mockFlatSite(12);

      await crawl();
      const firstCrawl = getBulkBatches();

      esClient.bulk.mockClear();
      await crawl();
      const secondCrawl = getBulkBatches();

      const toIdsByUrl = (batches: BulkBatch[]) =>
        Object.fromEntries(
          batches.flatMap(({ ids, documents }) =>
            documents.map(({ url }, position) => [url, ids[position]])
          )
        );

      const idsByUrl = toIdsByUrl(firstCrawl);
      expect(Object.keys(idsByUrl)).toHaveLength(12);
      for (const [url, id] of Object.entries(idsByUrl)) {
        expect(id).toBe(sha256(url));
      }
      expect(toIdsByUrl(secondCrawl)).toEqual(idsByUrl);
    });
  });

  describe('failures', () => {
    it('counts a page whose extraction throws without failing the crawl', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/broken', '/b']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/broken`]: new Error('extraction failed'),
        [`${ORIGIN}/b`]: pageLinkingTo([]),
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 3,
        failedCount: 1,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getIndexedDocuments().map(({ url }) => url)).toEqual([
        SEED_URL,
        `${ORIGIN}/a`,
        `${ORIGIN}/b`,
      ]);
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(`${ORIGIN}/broken`));
    });

    it('counts a page without content without failing the crawl', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/empty']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/empty`]: undefined,
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 2,
        failedCount: 1,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('does not count unreadable robots.txt and sitemaps as failed pages', async () => {
      siteFiles[ROBOTS_URL] = new Error('robots.txt unavailable');
      siteFiles[SITEMAP_URL] = new Error('sitemap unavailable');
      mockSite({ [SEED_URL]: pageLinkingTo([]) });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 1,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('counts the pages that Elasticsearch could not index', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/b', '/c']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/b`]: pageLinkingTo([]),
        [`${ORIGIN}/c`]: pageLinkingTo([]),
      });
      const rejectedIds = [sha256(`${ORIGIN}/a`), sha256(`${ORIGIN}/c`)];
      mockBulk((id) => (rejectedIds.includes(id) ? 'inference failed' : undefined));

      await expect(crawl()).resolves.toEqual({
        documentsCount: 2,
        failedCount: 2,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('rejects when the final bulk request throws', async () => {
      mockSite({ [SEED_URL]: pageLinkingTo([]) });
      esClient.bulk.mockRejectedValue(new Error('bulk unavailable'));

      await expect(crawl()).rejects.toThrow('bulk unavailable');
    });

    it('rejects and stops crawling when a bulk request throws during the crawl', async () => {
      mockPages((url) => {
        const { pathname } = new URL(url);
        const prefix = pathname === '/' ? '' : pathname;
        return pageLinkingTo(Array.from({ length: 20 }, (unused, page) => `${prefix}/p${page}`));
      });
      esClient.bulk.mockRejectedValue(new Error('bulk unavailable'));

      await expect(crawl()).rejects.toThrow('bulk unavailable');

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(getPageRequests().length).toBeLessThanOrEqual(21);
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
      expect(esClient.bulk).toHaveBeenCalledTimes(MAX_CONCURRENT_BULKS);
    });

    it('rejects with the extraction error when the seed page cannot be extracted', async () => {
      mockSite({ [SEED_URL]: new Error('endpoint unavailable') });

      await expect(crawl()).rejects.toThrow('endpoint unavailable');
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('rejects when the seed page has no content', async () => {
      mockSite({ [SEED_URL]: undefined });

      await expect(crawl()).rejects.toThrow(`No content could be extracted from ${SEED_URL}`);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('rejects with the indexing error when no page could be indexed', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
      });
      mockBulk(() => 'semantic_text inference failed');

      await expect(crawl()).rejects.toThrow('semantic_text inference failed');
    });
  });

  describe('path rules', () => {
    it('only follows the links under an included path', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/docs/a', '/blog/a', '/docs', '/documentation']),
        [`${ORIGIN}/docs/a`]: pageLinkingTo(['/docs/b', '/about']),
        [`${ORIGIN}/docs/b`]: pageLinkingTo([]),
      });

      await expect(
        crawl({ pathRules: { includePaths: ['/docs/'], excludePaths: [] } })
      ).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 4,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs/a`, `${ORIGIN}/docs/b`]);
    });

    it('follows the links under any of several included paths', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/docs/a', '/blog/a', '/shop/a']),
        [`${ORIGIN}/docs/a`]: pageLinkingTo([]),
        [`${ORIGIN}/blog/a`]: pageLinkingTo([]),
      });

      const { skippedByRulesCount } = await crawl({
        pathRules: { includePaths: ['/docs', '/blog'], excludePaths: [] },
      });

      expect(skippedByRulesCount).toBe(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs/a`, `${ORIGIN}/blog/a`]);
    });

    it('does not follow the links under an excluded path', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/docs/a', '/blog/a', '/blog']),
        [`${ORIGIN}/docs/a`]: pageLinkingTo(['/blog/b', '/about']),
        [`${ORIGIN}/about`]: pageLinkingTo([]),
      });

      await expect(
        crawl({ pathRules: { includePaths: [], excludePaths: ['/blog'] } })
      ).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 3,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs/a`, `${ORIGIN}/about`]);
    });

    it('lets an excluded path win over an included one', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/docs/a', '/docs/internal/a', '/docs/internal']),
        [`${ORIGIN}/docs/a`]: pageLinkingTo([]),
      });

      const { skippedByRulesCount } = await crawl({
        pathRules: { includePaths: ['/docs'], excludePaths: ['/docs/internal'] },
      });

      expect(skippedByRulesCount).toBe(2);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs/a`]);
    });

    it.each<[string, PathRules]>([
      ['is not under an included path', { includePaths: ['/docs'], excludePaths: [] }],
      ['is under an excluded path', { includePaths: [], excludePaths: ['/blog'] }],
    ])('crawls the seed URL even when it %s', async (_, pathRules) => {
      mockSite({
        [`${ORIGIN}/blog/start`]: pageLinkingTo(['/blog/next', '/docs/a']),
        [`${ORIGIN}/docs/a`]: pageLinkingTo(['/blog/start']),
      });

      const { documentsCount, skippedByRulesCount } = await crawl({
        url: `${ORIGIN}/blog/start`,
        pathRules,
      });

      expect(documentsCount).toBe(2);
      expect(skippedByRulesCount).toBe(1);
      expect(getPageRequests()).toEqual([`${ORIGIN}/blog/start`, `${ORIGIN}/docs/a`]);
    });

    it('applies the rules to the pages the sitemap lists', async () => {
      siteFiles[SITEMAP_URL] = toSitemap([
        `${ORIGIN}/docs/from-sitemap`,
        `${ORIGIN}/blog/from-sitemap`,
        `${ORIGIN}/docs/drafts/from-sitemap`,
      ]);
      mockSite({
        [SEED_URL]: pageLinkingTo([]),
        [`${ORIGIN}/docs/from-sitemap`]: pageLinkingTo([]),
      });

      await expect(
        crawl({ pathRules: { includePaths: ['/docs'], excludePaths: ['/docs/drafts'] } })
      ).resolves.toEqual({
        documentsCount: 2,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 2,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs/from-sitemap`]);
    });

    it('counts a link that the rules and robots.txt both rule out as skipped by the rules', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private\nDisallow: /secret';
      mockSite({
        [SEED_URL]: pageLinkingTo(['/private/a', '/private/b', '/secret', '/public']),
        [`${ORIGIN}/public`]: pageLinkingTo([]),
      });

      await expect(
        crawl({ pathRules: { includePaths: [], excludePaths: ['/private'] } })
      ).resolves.toEqual({
        documentsCount: 2,
        failedCount: 0,
        skippedByRobotsCount: 1,
        skippedByRulesCount: 2,
        purgedCount: 0,
        aborted: false,
      });
    });

    it('counts a skipped link once, however many pages link to it', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/blog/a`, `${ORIGIN}/private`]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/blog/a', '/private', '/a', '/b']),
        [`${ORIGIN}/a`]: pageLinkingTo(['/blog/a', '/blog/a#top', '/private']),
        [`${ORIGIN}/b`]: pageLinkingTo(['/blog/a', '/private']),
      });

      const { skippedByRobotsCount, skippedByRulesCount } = await crawl({
        pathRules: { includePaths: [], excludePaths: ['/blog'] },
      });

      expect(skippedByRulesCount).toBe(1);
      expect(skippedByRobotsCount).toBe(1);
    });

    it('does not spend the page budget on the links the rules skip', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/blog/a', '/blog/b', '/blog/c', '/x', '/y', '/z']),
        [`${ORIGIN}/x`]: pageLinkingTo([]),
        [`${ORIGIN}/y`]: pageLinkingTo([]),
        [`${ORIGIN}/z`]: pageLinkingTo([]),
      });

      await crawl({ maxDocuments: 3, pathRules: { includePaths: [], excludePaths: ['/blog'] } });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/x`, `${ORIGIN}/y`]);
    });

    it('follows every link when no rules are given', async () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/docs/a', '/blog/a']),
        [`${ORIGIN}/docs/a`]: pageLinkingTo([]),
        [`${ORIGIN}/blog/a`]: pageLinkingTo([]),
      });

      const { skippedByRulesCount } = await crawl({
        pathRules: { includePaths: [], excludePaths: [] },
      });

      expect(skippedByRulesCount).toBe(0);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs/a`, `${ORIGIN}/blog/a`]);
    });

    it('reports the skipped links in the progress', async () => {
      const onProgress = jest.fn<void, [CrawlProgress]>();
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
      mockSite({
        [SEED_URL]: pageLinkingTo(['/blog/a', '/blog/b', '/private', '/a']),
        [`${ORIGIN}/a`]: pageLinkingTo(['/blog/c', '/private/deeper']),
      });

      await crawl({ onProgress, pathRules: { includePaths: [], excludePaths: ['/blog'] } });

      const reports = onProgress.mock.calls.map(([progress]) => progress);
      const robotsSkips = reports.map(({ skippedByRobotsCount }) => skippedByRobotsCount);
      const rulesSkips = reports.map(({ skippedByRulesCount }) => skippedByRulesCount);
      expect(robotsSkips).toEqual([...robotsSkips].sort((a, b) => a - b));
      expect(rulesSkips).toEqual([...rulesSkips].sort((a, b) => a - b));
      expect(reports.at(-1)).toEqual({
        documentsCount: 2,
        failedCount: 0,
        requestedCount: 2,
        queuedCount: 0,
        skippedByRobotsCount: 2,
        skippedByRulesCount: 3,
      });
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

    const mockFlatSite = () => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/b', '/c']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/b`]: pageLinkingTo([]),
        [`${ORIGIN}/c`]: pageLinkingTo([]),
      });
    };

    beforeEach(() => {
      // The helpers that let the crawl run wait on `setImmediate`, so that one stays real.
      jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
      mockWaitFor.mockImplementation(actualWaitFor);
    });

    afterEach(() => {
      mockWaitFor.mockReset();
      jest.useRealTimers();
    });

    it('spaces out the page requests of all workers by the Crawl-delay of robots.txt', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1_999);
      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(1_999);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`]);

      await advance(2_000);

      await expect(crawling).resolves.toEqual({
        documentsCount: 4,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`, `${ORIGIN}/c`]);
    });

    it('does not make robots.txt, the sitemap or the seed page wait', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
      mockSite({ [SEED_URL]: pageLinkingTo([]), [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]) });

      const crawling = crawl();
      await letCrawlRun();

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SITEMAP_URL, SEED_URL]);

      await advance(2_000);
      await crawling;

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/from-sitemap`]);
    });

    it('makes the other start URLs of the site wait, as they are requests to it like any other', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockSite({
        [SEED_URL]: pageLinkingTo([]),
        [`${ORIGIN}/docs`]: pageLinkingTo([]),
        [`${ORIGIN}/blog`]: pageLinkingTo([]),
      });

      const crawling = crawl({ additionalSeedUrls: [`${ORIGIN}/docs`, `${ORIGIN}/blog`] });
      await letCrawlRun();

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1_999);
      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs`]);

      await advance(2_000);
      await crawling;

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs`, `${ORIGIN}/blog`]);
    });

    it('paces the www. host and the bare host of a site together', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockPages(() => pageLinkingTo([]));

      const crawling = crawl({ additionalSeedUrls: ['https://www.example.com/'] });
      await letCrawlRun();

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(2_000);
      await crawling;

      expect(getPageRequests()).toEqual([SEED_URL, 'https://www.example.com/']);
    });

    describe('on several sites', () => {
      const mockTwoSites = () => {
        mockSite({
          [SEED_URL]: pageLinkingTo(['/a-1', '/a-2', '/a-3']),
          [`${ORIGIN}/a-1`]: pageLinkingTo([]),
          [`${ORIGIN}/a-2`]: pageLinkingTo([]),
          [`${ORIGIN}/a-3`]: pageLinkingTo([]),
          [OTHER_SEED_URL]: pageLinkingTo(['/b-1', '/b-2']),
          [`${OTHER_ORIGIN}/b-1`]: pageLinkingTo([]),
          [`${OTHER_ORIGIN}/b-2`]: pageLinkingTo([]),
        });
      };

      const getPageRequestsTo = (origin: string): string[] =>
        getPageRequests().filter((url) => new URL(url).origin === origin);

      it('requests the first start URL of every site right away', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 3';
        mockPages(() => pageLinkingTo([]));

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL]);
        expect(mockWaitFor).not.toHaveBeenCalled();
        await crawling;
      });

      it('does not make the pages of a site wait for the pause another site asked for', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
        mockTwoSites();

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        expect(getPageRequestsTo(ORIGIN)).toEqual([SEED_URL]);
        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([
          OTHER_SEED_URL,
          `${OTHER_ORIGIN}/b-1`,
          `${OTHER_ORIGIN}/b-2`,
        ]);

        await advance(2_000);
        expect(getPageRequestsTo(ORIGIN)).toEqual([SEED_URL, `${ORIGIN}/a-1`]);

        await advance(2_000);
        expect(getPageRequestsTo(ORIGIN)).toEqual([SEED_URL, `${ORIGIN}/a-1`, `${ORIGIN}/a-2`]);

        await advance(2_000);

        await expect(crawling).resolves.toEqual({
          documentsCount: 7,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });
        for (const [delayMs] of mockWaitFor.mock.calls) {
          expect(delayMs).toBeLessThanOrEqual(6_000);
        }
      });

      it('paces each site by its own Crawl-delay', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 1';
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 3';
        mockTwoSites();

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();
        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL]);

        await advance(999);
        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL]);

        await advance(1);
        expect(getPageRequestsTo(ORIGIN)).toEqual([SEED_URL, `${ORIGIN}/a-1`]);
        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([OTHER_SEED_URL]);

        await advance(1_000);
        expect(getPageRequestsTo(ORIGIN)).toEqual([SEED_URL, `${ORIGIN}/a-1`, `${ORIGIN}/a-2`]);
        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([OTHER_SEED_URL]);

        await advance(999);
        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([OTHER_SEED_URL]);

        await advance(1);
        expect(getPageRequestsTo(ORIGIN)).toEqual([
          SEED_URL,
          `${ORIGIN}/a-1`,
          `${ORIGIN}/a-2`,
          `${ORIGIN}/a-3`,
        ]);
        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([OTHER_SEED_URL, `${OTHER_ORIGIN}/b-1`]);

        await advance(2_999);
        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([OTHER_SEED_URL, `${OTHER_ORIGIN}/b-1`]);

        await advance(1);
        await crawling;

        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([
          OTHER_SEED_URL,
          `${OTHER_ORIGIN}/b-1`,
          `${OTHER_ORIGIN}/b-2`,
        ]);
      });

      it('caps the pause of each site on its own', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 60';
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 1';
        mockTwoSites();

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        await advance(MAX_CRAWL_DELAY_MS - 1);
        expect(getPageRequestsTo(ORIGIN)).toEqual([SEED_URL]);
        expect(getPageRequestsTo(OTHER_ORIGIN)).toEqual([
          OTHER_SEED_URL,
          `${OTHER_ORIGIN}/b-1`,
          `${OTHER_ORIGIN}/b-2`,
        ]);

        await advance(1);
        expect(getPageRequestsTo(ORIGIN)).toEqual([SEED_URL, `${ORIGIN}/a-1`]);

        await advance(2 * MAX_CRAWL_DELAY_MS);
        await crawling;
      });

      it('queues the sitemap pages of every site once the start URLs that had to wait were crawled', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([`${OTHER_ORIGIN}/from-sitemap`]);
        mockPages(() => pageLinkingTo([]));

        const crawling = crawl({ additionalSeedUrls: [`${ORIGIN}/docs`, OTHER_SEED_URL] });
        await letCrawlRun();

        expect([...getPageRequests()].sort()).toEqual([OTHER_SEED_URL, SEED_URL]);

        await advance(2_000);
        await crawling;

        expect(getPageRequests().slice(2)).toEqual([
          `${ORIGIN}/docs`,
          `${OTHER_ORIGIN}/from-sitemap`,
        ]);
      });
    });

    it('accepts a delay of a fraction of a second', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 0.5';
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(499);

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(1_000);
      await crawling;
    });

    it('uses the delay of the Elastic-Crawler group when there is one', async () => {
      siteFiles[ROBOTS_URL] = [
        'User-agent: *',
        'Crawl-delay: 3',
        '',
        `User-agent: ${ROBOTS_USER_AGENT}`,
        'Crawl-delay: 1',
      ].join('\n');
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(999);

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(2_000);
      await crawling;
    });

    it.each([MAX_CRAWL_DELAY_MS / 1000 + 1, 60, 86_400])(
      `never waits longer than ${MAX_CRAWL_DELAY_MS}ms when robots.txt asks for %i seconds`,
      async (seconds) => {
        siteFiles[ROBOTS_URL] = `User-agent: *\nCrawl-delay: ${seconds}`;
        mockFlatSite();

        const crawling = crawl();
        await letCrawlRun();
        await advance(MAX_CRAWL_DELAY_MS - 1);

        expect(getPageRequests()).toEqual([SEED_URL]);

        await advance(1);
        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

        await advance(MAX_CRAWL_DELAY_MS);
        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`]);

        await advance(MAX_CRAWL_DELAY_MS);
        await crawling;
      }
    );

    it('waits exactly the delay when robots.txt asks for the longest one allowed', async () => {
      siteFiles[ROBOTS_URL] = `User-agent: *\nCrawl-delay: ${MAX_CRAWL_DELAY_MS / 1000}`;
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(MAX_CRAWL_DELAY_MS - 1);

      expect(getPageRequests()).toEqual([SEED_URL]);

      await advance(1);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);

      await advance(2 * MAX_CRAWL_DELAY_MS);
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
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/b`]);

      await advance(2_000);
      await crawling;
    });

    it.each(['0', '-1', 'soon', '', 'Infinity'])(
      'does not wait when the Crawl-delay is "%s"',
      async (crawlDelay) => {
        siteFiles[ROBOTS_URL] = `User-agent: *\nCrawl-delay: ${crawlDelay}`;
        mockFlatSite();

        await crawl();

        expect(getPageRequests()).toHaveLength(4);
        expect(mockWaitFor).not.toHaveBeenCalled();
      }
    );

    it('does not wait when robots.txt cannot be read', async () => {
      siteFiles[ROBOTS_URL] = new Error('robots.txt unavailable');
      mockFlatSite();

      await crawl();

      expect(getPageRequests()).toHaveLength(4);
      expect(mockWaitFor).not.toHaveBeenCalled();
    });

    it('stops waiting, and requests nothing more, when the signal is aborted during the wait', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(1_000);

      expect(getPageRequests()).toEqual([SEED_URL]);
      expect(jest.getTimerCount()).toBe(3);

      abortController.abort();

      await expect(crawling).resolves.toEqual({
        documentsCount: 1,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });
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

    it('waits on the signal of the crawl', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nCrawl-delay: 2';
      mockFlatSite();

      const crawling = crawl();
      await letCrawlRun();
      await advance(6_000);
      await crawling;

      const pageSignal = mockExtractPage.mock.calls.find(([, { url }]) => url === SEED_URL)?.[1]
        .signal;
      expect(mockWaitFor.mock.calls).toEqual([
        [2_000, pageSignal],
        [4_000, pageSignal],
        [6_000, pageSignal],
      ]);
    });
  });

  describe('outdated pages', () => {
    const mockSmallSite = (overrides: Site = {}) => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a', '/b']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/b`]: pageLinkingTo([]),
        ...overrides,
      });
    };

    it('deletes the pages of earlier crawls once the whole site was crawled and indexed', async () => {
      mockSmallSite();
      esClient.deleteByQuery.mockResolvedValue({ deleted: 7 });

      await expect(crawl({ maxDepth: 3 })).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 7,
        aborted: false,
      });

      const [[, { signal: crawlSignal }]] = mockExtractPage.mock.calls;
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
        { signal: crawlSignal }
      );
    });

    describe('hosts', () => {
      const getPurgedHosts = (): string[] => {
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        const [{ query }] = esClient.deleteByQuery.mock.calls[0];
        const [, hostFilter] = [query?.bool?.filter].flat();
        return [hostFilter?.terms?.url_host].flat().map(String);
      };

      beforeEach(() => {
        mockPages(() => pageLinkingTo([]));
      });

      it.each([
        ['the bare host', 'https://example.com/docs'],
        ['the www. host', 'https://www.example.com/docs'],
        ['another protocol and port', 'http://example.com:8080/'],
      ])(
        'deletes the pages of the bare and the www. host of the site when the crawl started from %s',
        async (_, url) => {
          await crawl({ url });

          expect(getPurgedHosts()).toEqual(['example.com', 'www.example.com']);
        }
      );

      it('deletes the pages of a subdomain without those of the domain above it', async () => {
        await crawl({ url: OTHER_SEED_URL });

        expect(getPurgedHosts()).toEqual(['docs.example.org', 'www.docs.example.org']);
      });

      it('lists a site once, however many start URLs it has', async () => {
        await crawl({
          additionalSeedUrls: [`${ORIGIN}/docs`, 'https://www.example.com/blog', `${ORIGIN}/about`],
        });

        expect(getPurgedHosts()).toEqual(['example.com', 'www.example.com']);
      });

      it('deletes the outdated pages of every site the crawl started from, in the order of the start URLs', async () => {
        esClient.deleteByQuery.mockResolvedValue({ deleted: 4 });

        await expect(
          crawl({
            additionalSeedUrls: [OTHER_SEED_URL, `${ORIGIN}/docs`, 'https://blog.example.net/'],
          })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 4, purgedCount: 4 }));

        expect(getPurgedHosts()).toEqual([
          'example.com',
          'www.example.com',
          'docs.example.org',
          'www.docs.example.org',
          'blog.example.net',
          'www.blog.example.net',
        ]);
      });

      it('never deletes the pages of a site the crawl did not start from, even when its pages link there', async () => {
        mockSite({
          [SEED_URL]: pageLinkingTo([`${OTHER_ORIGIN}/linked`, '/a']),
          [`${ORIGIN}/a`]: pageLinkingTo([]),
        });

        await crawl();

        expect(getPurgedHosts()).toEqual(['example.com', 'www.example.com']);
      });

      it('leaves out a site whose start URL was dropped because of its robots.txt', async () => {
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /';

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual(
          expect.objectContaining({ documentsCount: 1, skippedByRobotsCount: 1 })
        );

        expect(getPurgedHosts()).toEqual(['example.com', 'www.example.com']);
      });
    });

    it.each<[string, ExtractedPage | Error | undefined]>([
      ['could not be extracted', new Error('extraction failed')],
      ['had no content', undefined],
    ])('deletes nothing on any site when one of the start pages %s', async (_, brokenPage) => {
      mockSite({ [SEED_URL]: pageLinkingTo([]), [OTHER_SEED_URL]: brokenPage });

      await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
        documentsCount: 1,
        failedCount: 1,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when the start URLs alone reach the page limit', async () => {
      mockPages(() => pageLinkingTo([]));

      await crawl({ additionalSeedUrls: [`${ORIGIN}/docs`, OTHER_SEED_URL], maxDocuments: 3 });

      expect(getPageRequests()).toHaveLength(3);
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
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
      expect(esClient.deleteByQuery.mock.invocationCallOrder[0]).toBeGreaterThan(
        Math.max(...esClient.bulk.mock.invocationCallOrder)
      );
    });

    it('deletes them when the crawl stayed one page under the page limit', async () => {
      mockSmallSite();

      await crawl({ maxDocuments: 4 });

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    });

    it('deletes them when links were skipped because of robots.txt or the path rules', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
      mockSmallSite({ [SEED_URL]: pageLinkingTo(['/a', '/b', '/private', '/blog']) });
      esClient.deleteByQuery.mockResolvedValue({ deleted: 2 });

      await expect(
        crawl({ pathRules: { includePaths: [], excludePaths: ['/blog'] } })
      ).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 1,
        skippedByRulesCount: 1,
        purgedCount: 2,
        aborted: false,
      });
    });

    it('deletes nothing when the crawl reached the page limit', async () => {
      mockSmallSite();

      await expect(crawl({ maxDocuments: 3 })).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when the page limit cut the crawl short', async () => {
      mockLargeSite(30, 20);

      await crawl({ maxDocuments: 25 });

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it.each<[string, ExtractedPage | Error | undefined]>([
      ['could not be extracted', new Error('extraction failed')],
      ['had no content', undefined],
    ])('deletes nothing when a page %s', async (_, brokenPage) => {
      mockSmallSite({ [`${ORIGIN}/b`]: brokenPage });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 2,
        failedCount: 1,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when Elasticsearch could not index a page', async () => {
      mockSmallSite();
      mockBulk((id) => (id === sha256(`${ORIGIN}/b`) ? 'inference failed' : undefined));

      await expect(crawl()).resolves.toEqual({
        documentsCount: 2,
        failedCount: 1,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when no page was indexed', async () => {
      mockSmallSite({ [SEED_URL]: undefined });

      await expect(crawl()).rejects.toThrow(`No content could be extracted from ${SEED_URL}`);

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when a bulk request throws', async () => {
      mockSmallSite();
      esClient.bulk.mockRejectedValue(new Error('bulk unavailable'));

      await expect(crawl()).rejects.toThrow('bulk unavailable');

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when the signal is aborted during the crawl', async () => {
      hold(`${ORIGIN}/b`);
      mockSmallSite();

      const crawling = crawl();
      await waitUntil(() => getPageRequests().length === 3);
      await letCrawlRun();
      abortController.abort();

      await expect(crawling).resolves.toEqual({
        documentsCount: 2,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('deletes nothing when the signal is already aborted', async () => {
      mockSmallSite();
      abortController.abort();

      await crawl();

      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('completes the crawl with a warning when the pages cannot be deleted', async () => {
      mockSmallSite();
      esClient.deleteByQuery.mockRejectedValue(new Error('delete forbidden'));

      await expect(crawl()).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Web crawl of ${SEED_URL} could not remove outdated pages from ${INDEX_NAME}: delete forbidden`
      );
    });

    it('does not warn when the pages were deleted', async () => {
      mockSmallSite();

      await crawl();

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('abort', () => {
    it('does not request anything when the signal is already aborted', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /';
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
      mockSite({ [SEED_URL]: pageLinkingTo(['/a']) });
      abortController.abort();

      await expect(crawl()).resolves.toEqual({
        documentsCount: 0,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });

      expect(mockExtractPage).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('stops crawling when the signal is aborted during the crawl', async () => {
      mockPages((url) => {
        if (url === `${ORIGIN}/p2`) {
          abortController.abort();
        }
        return pageLinkingTo(
          url === SEED_URL
            ? Array.from({ length: 50 }, (unused, page) => `/p${page}`)
            : [`${new URL(url).pathname}/child`]
        );
      });

      const result = await crawl();

      expect(result.aborted).toBe(true);
      expect(result.failedCount).toBe(0);
      expect(getPageRequests().length).toBeLessThanOrEqual(1 + EXTRACTION_CONCURRENCY);
      expect(getPageRequests().some((url) => url.endsWith('/child'))).toBe(false);
      expect(esClient.bulk).not.toHaveBeenCalled();
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

      await expect(crawling).resolves.toEqual({
        documentsCount: 1,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });
      expect(getIndexedDocuments().map(({ url }) => url)).toEqual([SEED_URL]);
    });

    it('stops when the signal is aborted while only the sitemap is still being read', async () => {
      hold(SITEMAP_URL);
      mockSite({ [SEED_URL]: pageLinkingTo([]) });

      const crawling = crawl();
      await waitUntil(() => getIndexedDocuments().length === 1);
      await letCrawlRun();
      abortController.abort();

      await expect(crawling).resolves.toEqual({
        documentsCount: 1,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });
    });

    it('stops when the signal is aborted while a page is still being extracted', async () => {
      hold(`${ORIGIN}/slow`);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/slow']),
        [`${ORIGIN}/slow`]: pageLinkingTo(['/never']),
      });

      const crawling = crawl();
      await waitUntil(() => getPageRequests().length === 2);
      await letCrawlRun();
      abortController.abort();

      await expect(crawling).resolves.toEqual({
        documentsCount: 1,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/slow`]);
    });

    it('stops following the task signal once the crawl is done', async () => {
      mockSite({ [SEED_URL]: pageLinkingTo([]) });
      const addEventListener = jest.spyOn(abortController.signal, 'addEventListener');
      const removeEventListener = jest.spyOn(abortController.signal, 'removeEventListener');

      await crawl();

      expect(addEventListener).toHaveBeenCalledTimes(1);
      const [, listener] = addEventListener.mock.calls[0];
      expect(removeEventListener).toHaveBeenCalledWith('abort', listener);
    });

    it('stops before the sitemap and the pages when the signal is aborted while reading robots.txt', async () => {
      mockExtractPage.mockImplementation(async () => {
        abortController.abort();
        throw new Error('Request aborted');
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 0,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });

      expect(getRequestedUrls()).toEqual([ROBOTS_URL]);
    });

    it('does not count the extraction that the abort interrupted as a failure', async () => {
      mockPages(() => {
        abortController.abort();
        throw new Error('Request aborted');
      });

      await expect(crawl()).resolves.toEqual({
        documentsCount: 0,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: true,
      });

      expect(getPageRequests()).toEqual([SEED_URL]);
    });

    it('passes one abort signal to every page and bulk request, and another to the sitemap', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nAllow: /';
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
      });

      await crawl();

      const extractionSignals = new Map(
        mockExtractPage.mock.calls.map(([, { url, signal }]) => [url, signal])
      );
      const sitemapSignal = extractionSignals.get(SITEMAP_URL);
      extractionSignals.delete(SITEMAP_URL);
      const crawlSignals = [
        ...extractionSignals.values(),
        ...esClient.bulk.mock.calls.map(([, options]) => options?.signal),
      ];
      expect(mockExtractPage).toHaveBeenCalledTimes(4);
      expect(esClient.bulk).toHaveBeenCalled();
      for (const signal of crawlSignals) {
        expect(signal instanceof AbortSignal).toBe(true);
        expect(signal === crawlSignals[0]).toBe(true);
        expect(signal?.aborted).toBe(false);
      }
      expect(sitemapSignal instanceof AbortSignal).toBe(true);
      expect(sitemapSignal === crawlSignals[0]).toBe(false);
    });

    it('stops reading the sitemap once the page budget is spent', async () => {
      hold(SITEMAP_URL);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
      });

      const result = await crawl({ maxDocuments: 2 });

      const sitemapCall = mockExtractPage.mock.calls.find(([, { url }]) => url === SITEMAP_URL);
      expect(result).toEqual({
        documentsCount: 2,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });
      expect(sitemapCall?.[1].signal.aborted).toBe(true);
    });

    it('aborts the signal of in-flight requests when the task signal is aborted', async () => {
      const observed: boolean[] = [];
      mockPages((_, signal) => {
        observed.push(signal.aborted);
        abortController.abort();
        observed.push(signal.aborted);
        return pageLinkingTo([]);
      });

      await crawl();

      expect(observed).toEqual([false, true]);
    });

    it('aborts the signal of in-flight requests when a bulk request throws', async () => {
      mockPages(() => pageLinkingTo(Array.from({ length: 20 }, (unused, page) => `/p${page}`)));
      esClient.bulk.mockRejectedValue(new Error('bulk unavailable'));

      await expect(crawl()).rejects.toThrow('bulk unavailable');

      const [[, { signal }]] = mockExtractPage.mock.calls;
      expect(signal.aborted).toBe(true);
      expect(abortController.signal.aborted).toBe(false);
    });
  });

  describe('several start URLs', () => {
    const mockTwoSites = (overrides: Site = {}) => {
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [OTHER_SEED_URL]: pageLinkingTo(['/b']),
        [`${OTHER_ORIGIN}/b`]: pageLinkingTo([]),
        ...overrides,
      });
    };

    describe('on one site', () => {
      it('crawls every start URL at depth 0 and the pages they link to at depth 1', async () => {
        mockSite({
          [SEED_URL]: pageLinkingTo(['/a']),
          [`${ORIGIN}/docs`]: pageLinkingTo(['/docs/intro']),
          [`${ORIGIN}/blog`]: pageLinkingTo(['/blog/post']),
          [`${ORIGIN}/a`]: pageLinkingTo([]),
          [`${ORIGIN}/docs/intro`]: pageLinkingTo([]),
          [`${ORIGIN}/blog/post`]: pageLinkingTo([]),
        });

        await expect(
          crawl({ additionalSeedUrls: [`${ORIGIN}/docs`, `${ORIGIN}/blog`] })
        ).resolves.toEqual({
          documentsCount: 6,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([
          SEED_URL,
          `${ORIGIN}/docs`,
          `${ORIGIN}/blog`,
          `${ORIGIN}/a`,
          `${ORIGIN}/docs/intro`,
          `${ORIGIN}/blog/post`,
        ]);
        expect(getIndexedDepths()).toEqual({
          [SEED_URL]: 0,
          [`${ORIGIN}/docs`]: 0,
          [`${ORIGIN}/blog`]: 0,
          [`${ORIGIN}/a`]: 1,
          [`${ORIGIN}/docs/intro`]: 1,
          [`${ORIGIN}/blog/post`]: 1,
        });
      });

      it('reads robots.txt and the sitemap of the site once', async () => {
        mockPages(() => pageLinkingTo([]));

        await crawl({ additionalSeedUrls: [`${ORIGIN}/docs`, `${ORIGIN}/blog`] });

        expect(getRequestedUrls()).toEqual([
          ROBOTS_URL,
          SITEMAP_URL,
          SEED_URL,
          `${ORIGIN}/docs`,
          `${ORIGIN}/blog`,
        ]);
      });

      it('requests a start URL once when it is given several times', async () => {
        mockPages(() => pageLinkingTo([]));

        await expect(
          crawl({
            additionalSeedUrls: [SEED_URL, `${ORIGIN}/docs`, `${ORIGIN}/docs`, SEED_URL],
          })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 2, failedCount: 0 }));

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs`]);
      });

      it('crawls like a crawl of the one URL when the other start URLs only repeat it', async () => {
        mockSite({ [SEED_URL]: pageLinkingTo(['/a']), [`${ORIGIN}/a`]: pageLinkingTo([]) });

        await crawl({ additionalSeedUrls: [SEED_URL] });

        expect(getRequestedUrls()).toEqual([ROBOTS_URL, SITEMAP_URL, SEED_URL, `${ORIGIN}/a`]);
        expect(getIndexedDepths()).toEqual({ [SEED_URL]: 0, [`${ORIGIN}/a`]: 1 });
      });

      it('keeps a start page at depth 0, and requests it once, when other pages link to it', async () => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/docs`, SEED_URL]);
        mockSite({
          [SEED_URL]: pageLinkingTo(['/docs', '/a']),
          [`${ORIGIN}/docs`]: pageLinkingTo(['/', '/a']),
          [`${ORIGIN}/a`]: pageLinkingTo(['/docs', '/']),
        });

        await crawl({ additionalSeedUrls: [`${ORIGIN}/docs`] });

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs`, `${ORIGIN}/a`]);
        expect(getIndexedDepths()).toEqual({
          [SEED_URL]: 0,
          [`${ORIGIN}/docs`]: 0,
          [`${ORIGIN}/a`]: 1,
        });
      });

      it('crawls a start URL that the path rules would rule out as a link', async () => {
        mockSite({
          [SEED_URL]: pageLinkingTo(['/blog/post']),
          [`${ORIGIN}/blog`]: pageLinkingTo(['/blog/other', '/docs/intro']),
          [`${ORIGIN}/docs/intro`]: pageLinkingTo([]),
        });

        await expect(
          crawl({
            additionalSeedUrls: [`${ORIGIN}/blog`],
            pathRules: { includePaths: ['/docs'], excludePaths: [] },
          })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 3, skippedByRulesCount: 2 }));

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/blog`, `${ORIGIN}/docs/intro`]);
      });

      it.each([
        ['the bare host', SEED_URL, 'https://www.example.com/docs', ORIGIN],
        ['the www. host', 'https://www.example.com/', `${ORIGIN}/docs`, 'https://www.example.com'],
      ])(
        'treats the www. host and the bare host as one site, read from %s when the first start URL is on it',
        async (_, url, otherUrl, origin) => {
          mockPages(() => pageLinkingTo([]));

          await crawl({ additionalSeedUrls: [otherUrl] });
          expect(getRequestedUrls()).toEqual([ROBOTS_URL, SITEMAP_URL, SEED_URL, otherUrl]);
          mockExtractPage.mockClear();

          await crawl({ url, additionalSeedUrls: [otherUrl] });

          expect(getSiteFileRequests()).toEqual([`${origin}/robots.txt`, `${origin}/sitemap.xml`]);
          expect(getPageRequests()).toEqual([url, otherUrl]);
        }
      );

      it('applies the robots.txt of the site to the start URLs and links on its www. host', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
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
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 3, skippedByRobotsCount: 2 }));

        expect(getPageRequests()).toEqual([
          SEED_URL,
          'https://www.example.com/docs',
          `${ORIGIN}/a`,
        ]);
      });
    });

    describe('on several sites', () => {
      it('crawls every site from its start URL into the one index', async () => {
        mockTwoSites();

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 4,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

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
        for (const [params] of esClient.bulk.mock.calls) {
          expect(params?.index).toBe(INDEX_NAME);
        }
        expect(
          getIndexedDocuments().map(({ url, depth, url_host: host, crawl_id: crawlId }) => ({
            url,
            depth,
            host,
            crawlId,
          }))
        ).toEqual([
          { url: SEED_URL, depth: 0, host: 'example.com', crawlId: CRAWL_ID },
          { url: OTHER_SEED_URL, depth: 0, host: 'docs.example.org', crawlId: CRAWL_ID },
          { url: `${ORIGIN}/a`, depth: 1, host: 'example.com', crawlId: CRAWL_ID },
          { url: `${OTHER_ORIGIN}/b`, depth: 1, host: 'docs.example.org', crawlId: CRAWL_ID },
        ]);
      });

      it('reads one robots.txt and one sitemap per site, however many start URLs a site has', async () => {
        mockPages(() => pageLinkingTo([]));

        await crawl({
          additionalSeedUrls: [
            `${ORIGIN}/docs`,
            OTHER_SEED_URL,
            `${ORIGIN}/blog`,
            `${OTHER_ORIGIN}/guide`,
          ],
        });

        expect(getSiteFileRequests()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          SITEMAP_URL,
          OTHER_SITEMAP_URL,
        ]);
        expect(getPageRequests()).toEqual([
          SEED_URL,
          `${ORIGIN}/docs`,
          OTHER_SEED_URL,
          `${ORIGIN}/blog`,
          `${OTHER_ORIGIN}/guide`,
        ]);
      });

      it('reads robots.txt and the sitemap from the root of each site, whatever the paths of the start URLs', async () => {
        mockPages(() => pageLinkingTo([]));

        await crawl({
          url: `${ORIGIN}/docs/guide/intro`,
          additionalSeedUrls: [`${OTHER_ORIGIN}/reference/api?version=2`],
        });

        expect(getSiteFileRequests()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          SITEMAP_URL,
          OTHER_SITEMAP_URL,
        ]);
      });

      it('treats a subdomain as a site of its own', async () => {
        mockPages(() => pageLinkingTo([]));

        await crawl({ additionalSeedUrls: ['https://docs.example.com/'] });

        expect(getSiteFileRequests()).toEqual([
          ROBOTS_URL,
          'https://docs.example.com/robots.txt',
          SITEMAP_URL,
          'https://docs.example.com/sitemap.xml',
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

        expect(getRequestedUrls().slice(0, 4)).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          SITEMAP_URL,
          OTHER_SITEMAP_URL,
        ]);
        expect(getPageRequests()).toHaveLength(4);
      });

      it('applies the robots.txt of each site to the pages of that site only', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /internal';
        mockSite({
          [SEED_URL]: pageLinkingTo(['/private', '/internal']),
          [`${ORIGIN}/private`]: pageLinkingTo([]),
          [`${ORIGIN}/internal`]: pageLinkingTo([]),
          [OTHER_SEED_URL]: pageLinkingTo(['/private', '/internal']),
          [`${OTHER_ORIGIN}/private`]: pageLinkingTo([]),
          [`${OTHER_ORIGIN}/internal`]: pageLinkingTo([]),
        });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 4,
          failedCount: 0,
          skippedByRobotsCount: 2,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/internal`,
          `${OTHER_ORIGIN}/private`,
        ]);
      });

      it('applies the user agent group of each robots.txt on its own', async () => {
        siteFiles[ROBOTS_URL] = [
          'User-agent: *',
          'Disallow: /',
          '',
          `User-agent: ${ROBOTS_USER_AGENT}`,
          'Disallow: /private',
        ].join('\n');
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
        mockSite({
          [SEED_URL]: pageLinkingTo(['/private', '/open']),
          [`${ORIGIN}/open`]: pageLinkingTo([]),
          [OTHER_SEED_URL]: pageLinkingTo(['/private', '/open']),
          [`${OTHER_ORIGIN}/open`]: pageLinkingTo([]),
        });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual(
          expect.objectContaining({ documentsCount: 4, skippedByRobotsCount: 2 })
        );
      });

      it.each<[string, string | Error | undefined]>([
        ['cannot be read', new Error('robots.txt unavailable')],
        ['is missing', undefined],
        ['is empty', ''],
      ])(
        'allows everything on a site whose robots.txt %s, and still honours that of the other site',
        async (_, robotsTxt) => {
          siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
          siteFiles[OTHER_ROBOTS_URL] = robotsTxt;
          mockSite({
            [SEED_URL]: pageLinkingTo(['/private']),
            [OTHER_SEED_URL]: pageLinkingTo(['/private']),
            [`${OTHER_ORIGIN}/private`]: pageLinkingTo([]),
          });

          await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
            documentsCount: 3,
            failedCount: 0,
            skippedByRobotsCount: 1,
            skippedByRulesCount: 0,
            purgedCount: 0,
            aborted: false,
          });

          expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL, `${OTHER_ORIGIN}/private`]);
        }
      );

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

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 4,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/a`,
          `${OTHER_ORIGIN}/b`,
        ]);
      });

      it('applies the path rules to the links of every site', async () => {
        mockSite({
          [SEED_URL]: pageLinkingTo(['/docs/a', '/blog/a']),
          [`${ORIGIN}/docs/a`]: pageLinkingTo([]),
          [OTHER_SEED_URL]: pageLinkingTo(['/docs/b', '/blog/b']),
          [`${OTHER_ORIGIN}/docs/b`]: pageLinkingTo([]),
        });

        await expect(
          crawl({
            additionalSeedUrls: [OTHER_SEED_URL],
            pathRules: { includePaths: ['/docs'], excludePaths: [] },
          })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 4, skippedByRulesCount: 2 }));
      });

      it('crawls every start URL at a maximum depth of 0, without their links or the sitemaps', async () => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockTwoSites();

        await crawl({ additionalSeedUrls: [OTHER_SEED_URL], maxDepth: 0 });

        expect(getRequestedUrls()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          SEED_URL,
          OTHER_SEED_URL,
        ]);
      });

      it('completes when one of the start pages cannot be extracted', async () => {
        mockTwoSites({ [SEED_URL]: new Error('extraction failed') });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 2,
          failedCount: 1,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL, `${OTHER_ORIGIN}/b`]);
      });

      it('rejects with the extraction error when no start page can be extracted', async () => {
        mockSite({
          [SEED_URL]: new Error('first extraction failed'),
          [OTHER_SEED_URL]: new Error('last extraction failed'),
        });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).rejects.toThrow(
          'last extraction failed'
        );
      });

      it('rejects, naming the URL it was started with, when no start page has content', async () => {
        mockSite({});

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).rejects.toThrow(
          new Error(`No content could be extracted from ${SEED_URL}`)
        );
      });
    });

    describe('start URLs that robots.txt disallows', () => {
      it('drops the start URL of a site that disallows it, counts it and crawls the other sites', async () => {
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        mockTwoSites();

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 2,
          failedCount: 0,
          skippedByRobotsCount: 1,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);
        expect(getIndexedDepths()).toEqual({ [SEED_URL]: 0, [`${ORIGIN}/a`]: 1 });
      });

      it('drops the URL the crawl was started with when the other start URLs are allowed', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private/';
        mockSite({
          [`${ORIGIN}/private/start`]: pageLinkingTo([]),
          [`${ORIGIN}/docs`]: pageLinkingTo(['/docs/intro']),
          [`${ORIGIN}/docs/intro`]: pageLinkingTo([]),
          [OTHER_SEED_URL]: pageLinkingTo([]),
        });

        await expect(
          crawl({
            url: `${ORIGIN}/private/start`,
            additionalSeedUrls: [`${ORIGIN}/docs`, OTHER_SEED_URL],
          })
        ).resolves.toEqual({
          documentsCount: 3,
          failedCount: 0,
          skippedByRobotsCount: 1,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([
          `${ORIGIN}/docs`,
          OTHER_SEED_URL,
          `${ORIGIN}/docs/intro`,
        ]);
        expect(getIndexedDepths()).toEqual({
          [`${ORIGIN}/docs`]: 0,
          [OTHER_SEED_URL]: 0,
          [`${ORIGIN}/docs/intro`]: 1,
        });
      });

      it('still reads the sitemap from the root of a site whose first start URL was dropped', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private/';
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockPages(() => pageLinkingTo([]));

        await crawl({ url: `${ORIGIN}/private/start`, additionalSeedUrls: [`${ORIGIN}/docs`] });

        expect(getRequestedUrls()).toEqual([
          ROBOTS_URL,
          SITEMAP_URL,
          `${ORIGIN}/docs`,
          `${ORIGIN}/from-sitemap`,
        ]);
      });

      it('counts every dropped start URL once, also when pages link to it afterwards', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/private/1`, `${ORIGIN}/private/2`]);
        mockSite({
          [SEED_URL]: pageLinkingTo(['/private/1', '/private/3', '/a']),
          [`${ORIGIN}/a`]: pageLinkingTo(['/private/2', '/private/3']),
        });

        await expect(
          crawl({ additionalSeedUrls: [`${ORIGIN}/private/1`, `${ORIGIN}/private/2`] })
        ).resolves.toEqual({
          documentsCount: 2,
          failedCount: 0,
          skippedByRobotsCount: 3,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`]);
      });

      it('reports the dropped start URLs as skipped from the first progress report on', async () => {
        const onProgress = jest.fn<void, [CrawlProgress]>();
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        mockTwoSites();

        await crawl({ additionalSeedUrls: [OTHER_SEED_URL, `${OTHER_ORIGIN}/guide`], onProgress });

        expect(onProgress).toHaveBeenCalled();
        for (const [{ skippedByRobotsCount }] of onProgress.mock.calls) {
          expect(skippedByRobotsCount).toBe(2);
        }
        expect(onProgress.mock.calls.at(-1)?.[0]).toEqual({
          documentsCount: 2,
          failedCount: 0,
          requestedCount: 2,
          queuedCount: 0,
          skippedByRobotsCount: 2,
          skippedByRulesCount: 0,
        });
      });

      it('reads the sitemap of a site whose start URL was dropped, and skips the pages it lists that its robots.txt disallows', async () => {
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /\nAllow: /public';
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([
          `${OTHER_ORIGIN}/guide`,
          `${OTHER_ORIGIN}/public/page`,
        ]);
        mockTwoSites({ [`${OTHER_ORIGIN}/public/page`]: pageLinkingTo([]) });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 3,
          failedCount: 0,
          skippedByRobotsCount: 2,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${OTHER_ORIGIN}/public/page`]);
        expect(getIndexedDepths()[`${OTHER_ORIGIN}/public/page`]).toBe(1);
      });

      it('rejects without requesting any page when the robots.txt of every site disallows its start URL', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
        mockTwoSites();

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).rejects.toThrow(
          new Error(NO_START_URL_ALLOWED)
        );

        expect(getRequestedUrls()).toEqual([ROBOTS_URL, OTHER_ROBOTS_URL]);
        expect(esClient.bulk).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      });

      it('rejects with the same message when every start URL of one site is disallowed', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private/';
        mockPages(() => pageLinkingTo([]));

        await expect(
          crawl({
            url: `${ORIGIN}/private/a`,
            additionalSeedUrls: [`${ORIGIN}/private/b`, 'https://www.example.com/private/c'],
          })
        ).rejects.toThrow(new Error(NO_START_URL_ALLOWED));

        expect(getRequestedUrls()).toEqual([ROBOTS_URL]);
      });

      it('names the URL in the error when it is the only start URL, however often it was given', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        mockTwoSites();

        await expect(crawl({ additionalSeedUrls: [SEED_URL, SEED_URL] })).rejects.toThrow(
          new Error(`The site's robots.txt does not allow crawling ${SEED_URL}`)
        );
        await expect(crawl({ additionalSeedUrls: [] })).rejects.toThrow(
          new Error(`The site's robots.txt does not allow crawling ${SEED_URL}`)
        );

        expect(getPageRequests()).toEqual([]);
      });

      it('stops following the task signal once it rejected every start URL', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        mockSite({});
        const removeEventListener = jest.spyOn(abortController.signal, 'removeEventListener');

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).rejects.toThrow(
          NO_START_URL_ALLOWED
        );

        expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
      });
    });

    describe('page budget', () => {
      const toSeedUrls = (count: number): string[] =>
        Array.from({ length: count }, (_, seed) => `${ORIGIN}/start-${seed}`);

      it('requests the start URLs in the order given, up to the page limit, and finishes', async () => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockPages(() => pageLinkingTo(['/linked']));

        await expect(
          crawl({ additionalSeedUrls: toSeedUrls(4), maxDocuments: 3 })
        ).resolves.toEqual({
          documentsCount: 3,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/start-0`, `${ORIGIN}/start-1`]);
        expect(getIndexedDocuments().map(({ depth }) => depth)).toEqual([0, 0, 0]);
      });

      it.each([2, 3, EXTRACTION_CONCURRENCY])(
        'finishes when the %i start URLs are exactly as many as the page limit',
        async (count) => {
          siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
          mockPages(() => pageLinkingTo(['/linked']));

          await expect(
            crawl({ additionalSeedUrls: toSeedUrls(count - 1), maxDocuments: count })
          ).resolves.toEqual(expect.objectContaining({ documentsCount: count, aborted: false }));

          expect(getPageRequests()).toEqual([SEED_URL, ...toSeedUrls(count - 1)]);
        }
      );

      it('crawls only the URL it was started with, and reads no sitemap, when one page may be crawled', async () => {
        mockTwoSites();

        await expect(
          crawl({ additionalSeedUrls: [OTHER_SEED_URL, `${ORIGIN}/docs`], maxDocuments: 1 })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 1 }));

        expect(getRequestedUrls()).toEqual([ROBOTS_URL, OTHER_ROBOTS_URL, SEED_URL]);
      });

      it('does not spend the page budget on the start URLs that were dropped', async () => {
        siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /start-0\nDisallow: /start-1';
        mockPages(() => pageLinkingTo([]));

        await expect(
          crawl({ additionalSeedUrls: toSeedUrls(4), maxDocuments: 3 })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 3, skippedByRobotsCount: 2 }));

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/start-2`, `${ORIGIN}/start-3`]);
      });

      it('crawls every start URL before any page they link to, when there are more of them than workers', async () => {
        const seedUrls = [SEED_URL, ...toSeedUrls(EXTRACTION_CONCURRENCY + 2)];
        mockPages((url) =>
          pageLinkingTo(seedUrls.includes(url) ? [`/child${new URL(url).pathname}`] : [])
        );

        await expect(crawl({ additionalSeedUrls: seedUrls.slice(1) })).resolves.toEqual(
          expect.objectContaining({ documentsCount: 2 * seedUrls.length, failedCount: 0 })
        );

        expect(getPageRequests().slice(0, seedUrls.length)).toEqual(seedUrls);
        expect(
          getIndexedDocuments()
            .filter(({ depth }) => depth === 0)
            .map(({ url }) => url)
        ).toEqual(seedUrls);
      });

      it('counts a start page that could not be extracted against the budget', async () => {
        mockSite({
          [SEED_URL]: pageLinkingTo(['/a', '/b']),
          [`${ORIGIN}/docs`]: new Error('extraction failed'),
          [`${ORIGIN}/a`]: pageLinkingTo([]),
          [`${ORIGIN}/b`]: pageLinkingTo([]),
        });

        await expect(
          crawl({ additionalSeedUrls: [`${ORIGIN}/docs`], maxDocuments: 3 })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 2, failedCount: 1 }));

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/docs`, `${ORIGIN}/a`]);
      });
    });

    describe('sitemaps', () => {
      it('queues the sitemap pages only once every start page was crawled', async () => {
        const releaseOtherSeed = hold(OTHER_SEED_URL);
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockTwoSites({ [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]) });

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        expect(getRequestedUrls()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          SITEMAP_URL,
          OTHER_SITEMAP_URL,
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/a`,
        ]);

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

      it('queues the sitemap pages behind the links of the start page that was crawled last', async () => {
        const releaseOtherSeed = hold(OTHER_SEED_URL);
        const linkedPages = Array.from(
          { length: EXTRACTION_CONCURRENCY + 2 },
          (_, page) => `${OTHER_ORIGIN}/linked-${page}`
        );
        const sitemapPages = [`${ORIGIN}/from-sitemap-1`, `${ORIGIN}/from-sitemap-2`];
        siteFiles[SITEMAP_URL] = toSitemap(sitemapPages);
        mockPages((url) => pageLinkingTo(url === OTHER_SEED_URL ? linkedPages : []));

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL]);

        releaseOtherSeed();
        await crawling;

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          ...linkedPages,
          ...sitemapPages,
        ]);
      });

      it.each<[string, ExtractedPage | Error | undefined]>([
        ['could not be extracted', new Error('extraction failed')],
        ['had no content', undefined],
      ])('queues the sitemap pages when a start page %s', async (_, brokenPage) => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockTwoSites({
          [OTHER_SEED_URL]: brokenPage,
          [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]),
        });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 3,
          failedCount: 1,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/a`,
          `${ORIGIN}/from-sitemap`,
        ]);
      });

      it('does not wait for a start URL that was dropped before it queues the sitemap pages', async () => {
        siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /';
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-sitemap`]);
        mockTwoSites({ [`${ORIGIN}/from-sitemap`]: pageLinkingTo([]) });

        await crawl({ additionalSeedUrls: [OTHER_SEED_URL] });

        expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/from-sitemap`]);
      });

      it('reads the sitemaps each site declares, and /sitemap.xml for a site that declares none', async () => {
        siteFiles[ROBOTS_URL] = `User-agent: *\nSitemap: ${ORIGIN}/sitemaps/pages.xml`;
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/not-declared`]);
        siteFiles[`${ORIGIN}/sitemaps/pages.xml`] = toSitemap([`${ORIGIN}/from-declared`]);
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([`${OTHER_ORIGIN}/from-default`]);
        mockPages(() => pageLinkingTo([]));

        await crawl({ additionalSeedUrls: [OTHER_SEED_URL] });

        expect(getSiteFileRequests()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          `${ORIGIN}/sitemaps/pages.xml`,
          OTHER_SITEMAP_URL,
        ]);
        expect(getIndexedDepths()).toEqual({
          [SEED_URL]: 0,
          [OTHER_SEED_URL]: 0,
          [`${ORIGIN}/from-declared`]: 1,
          [`${OTHER_ORIGIN}/from-default`]: 1,
        });
      });

      it('does not read the sitemaps that the robots.txt of one site declares for another site', async () => {
        siteFiles[ROBOTS_URL] = `User-agent: *\nSitemap: ${ORIGIN}/sitemaps/pages.xml`;
        siteFiles[`${ORIGIN}/sitemaps/pages.xml`] = toSitemap([
          `${ORIGIN}/from-declared`,
          `${OTHER_ORIGIN}/from-declared`,
        ]);
        mockPages(() => pageLinkingTo([]));

        await crawl({ additionalSeedUrls: [OTHER_SEED_URL] });

        expect(
          getSiteFileRequests().filter((url) => url === `${ORIGIN}/sitemaps/pages.xml`)
        ).toHaveLength(1);
        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL, `${ORIGIN}/from-declared`]);
      });

      it('keeps from the sitemap of a site only the pages of that site, even those of another start site', async () => {
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/own-a`, `${OTHER_ORIGIN}/listed-by-a`]);
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([
          `${OTHER_ORIGIN}/own-b`,
          `${ORIGIN}/listed-by-b`,
        ]);
        mockPages(() => pageLinkingTo([]));

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual(
          expect.objectContaining({ documentsCount: 4, skippedByRobotsCount: 0 })
        );

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/own-a`,
          `${OTHER_ORIGIN}/own-b`,
        ]);
      });

      it('queues the sitemap pages of the sites in the order of their first start URLs', async () => {
        const releaseSitemap = hold(SITEMAP_URL);
        siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-a-1`, `${ORIGIN}/from-a-2`]);
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([`${OTHER_ORIGIN}/from-b`]);
        mockPages(() => pageLinkingTo([]));

        const crawling = crawl({ additionalSeedUrls: [OTHER_SEED_URL] });
        await letCrawlRun();

        expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL]);

        releaseSitemap();
        await crawling;

        expect(getPageRequests()).toEqual([
          SEED_URL,
          OTHER_SEED_URL,
          `${ORIGIN}/from-a-1`,
          `${ORIGIN}/from-a-2`,
          `${OTHER_ORIGIN}/from-b`,
        ]);
      });

      it('gives every site its own 3 sitemap requests', async () => {
        const toDeclared = (origin: string): string[] =>
          Array.from({ length: 5 }, (_, sitemap) => `${origin}/sitemap-${sitemap}.xml`);
        siteFiles[ROBOTS_URL] = toDeclared(ORIGIN)
          .map((sitemap) => `Sitemap: ${sitemap}`)
          .join('\n');
        siteFiles[OTHER_ROBOTS_URL] = toDeclared(OTHER_ORIGIN)
          .map((sitemap) => `Sitemap: ${sitemap}`)
          .join('\n');
        mockPages(() => pageLinkingTo([]));

        await crawl({ additionalSeedUrls: [OTHER_SEED_URL] });

        expect(getSiteFileRequests()).toEqual([
          ROBOTS_URL,
          OTHER_ROBOTS_URL,
          ...toDeclared(ORIGIN).slice(0, 3),
          ...toDeclared(OTHER_ORIGIN).slice(0, 3),
        ]);
      });

      it('crawls the sites when the sitemap of one of them cannot be read', async () => {
        siteFiles[SITEMAP_URL] = new Error('sitemap unavailable');
        siteFiles[OTHER_SITEMAP_URL] = toSitemap([`${OTHER_ORIGIN}/from-sitemap`]);
        mockTwoSites({ [`${OTHER_ORIGIN}/from-sitemap`]: pageLinkingTo([]) });

        await expect(crawl({ additionalSeedUrls: [OTHER_SEED_URL] })).resolves.toEqual({
          documentsCount: 5,
          failedCount: 0,
          skippedByRobotsCount: 0,
          skippedByRulesCount: 0,
          purgedCount: 0,
          aborted: false,
        });
      });

      it('never requests more pages than the budget when the sitemaps of the sites list more', async () => {
        siteFiles[SITEMAP_URL] = toSitemap(
          Array.from({ length: 20 }, (_, page) => `${ORIGIN}/a-${page}`)
        );
        siteFiles[OTHER_SITEMAP_URL] = toSitemap(
          Array.from({ length: 20 }, (_, page) => `${OTHER_ORIGIN}/b-${page}`)
        );
        mockPages(() => pageLinkingTo([]));

        await expect(
          crawl({ additionalSeedUrls: [OTHER_SEED_URL], maxDocuments: 12 })
        ).resolves.toEqual(expect.objectContaining({ documentsCount: 12 }));

        expect(getPageRequests()).toHaveLength(12);
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      });
    });
  });

  describe('explicit sitemap URLs', () => {
    const EXPLICIT_SITEMAP_URL = `${ORIGIN}/custom/pages.xml`;

    it('reads one that a crawl would not follow as a link', async () => {
      const deepSitemapUrl = `${ORIGIN}/${Array.from({ length: 17 }, (_, i) => `s${i}`).join(
        '/'
      )}/sitemap.xml`;
      siteFiles[deepSitemapUrl] = toSitemap([`${ORIGIN}/from-deep`]);
      mockSite({ [SEED_URL]: pageLinkingTo([]), [`${ORIGIN}/from-deep`]: pageLinkingTo([]) });

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

    it('reads them besides the sitemap of the site, and crawls the pages they list at depth 1', async () => {
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-site`]);
      mockSite({
        [SEED_URL]: pageLinkingTo([]),
        [`${ORIGIN}/from-explicit`]: pageLinkingTo(['/below-explicit']),
        [`${ORIGIN}/from-site`]: pageLinkingTo([]),
        [`${ORIGIN}/below-explicit`]: pageLinkingTo([]),
      });

      await expect(crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] })).resolves.toEqual({
        documentsCount: 4,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, EXPLICIT_SITEMAP_URL, SITEMAP_URL]);
      expect(getIndexedDepths()).toEqual({
        [SEED_URL]: 0,
        [`${ORIGIN}/from-explicit`]: 1,
        [`${ORIGIN}/from-site`]: 1,
        [`${ORIGIN}/below-explicit`]: 2,
      });
    });

    it('reads only the sitemaps of the sites when none are given', async () => {
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls: [] });
      await crawl();

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, SITEMAP_URL, ROBOTS_URL, SITEMAP_URL]);
    });

    it('reads them besides the sitemaps that robots.txt declares', async () => {
      siteFiles[ROBOTS_URL] = `User-agent: *\nSitemap: ${ORIGIN}/declared.xml`;
      siteFiles[`${ORIGIN}/declared.xml`] = toSitemap([`${ORIGIN}/from-declared`]);
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] });

      expect(getSiteFileRequests()).toEqual([
        ROBOTS_URL,
        EXPLICIT_SITEMAP_URL,
        `${ORIGIN}/declared.xml`,
      ]);
      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/from-explicit`,
        `${ORIGIN}/from-declared`,
      ]);
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
    });

    it('queues their pages in the order the sitemaps were given', async () => {
      const sitemapUrls = [`${ORIGIN}/c.xml`, `${ORIGIN}/a.xml`, `${ORIGIN}/b.xml`];
      siteFiles[`${ORIGIN}/a.xml`] = toSitemap([`${ORIGIN}/from-a`]);
      siteFiles[`${ORIGIN}/b.xml`] = toSitemap([`${ORIGIN}/from-b`]);
      siteFiles[`${ORIGIN}/c.xml`] = toSitemap([`${ORIGIN}/from-c`]);
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls });

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, ...sitemapUrls, SITEMAP_URL]);
      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/from-c`,
        `${ORIGIN}/from-a`,
        `${ORIGIN}/from-b`,
      ]);
    });

    it(`reads all of as many as ${WEB_CRAWL_MAX_SITEMAP_URLS} explicit sitemaps, more than the 3 a site gets`, async () => {
      const sitemapUrls = Array.from(
        { length: WEB_CRAWL_MAX_SITEMAP_URLS },
        (_, sitemap) => `${ORIGIN}/explicit-${sitemap}.xml`
      );
      sitemapUrls.forEach((sitemapUrl, sitemap) => {
        siteFiles[sitemapUrl] = toSitemap([`${ORIGIN}/from-explicit-${sitemap}`]);
      });
      mockPages(() => pageLinkingTo([]));

      await expect(crawl({ sitemapUrls })).resolves.toEqual(
        expect.objectContaining({ documentsCount: WEB_CRAWL_MAX_SITEMAP_URLS + 1 })
      );

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, ...sitemapUrls, SITEMAP_URL]);
    });

    it('reads every explicit sitemap and up to 3 of the sitemaps they list', async () => {
      const toNested = (name: string): string[] =>
        Array.from({ length: 4 }, (_, sitemap) => `${ORIGIN}/${name}-${sitemap}.xml`);
      const sitemapUrls = [`${ORIGIN}/index-a.xml`, `${ORIGIN}/plain.xml`, `${ORIGIN}/index-b.xml`];
      siteFiles[`${ORIGIN}/index-a.xml`] = toSitemap(toNested('nested-a'));
      siteFiles[`${ORIGIN}/index-b.xml`] = toSitemap(toNested('nested-b'));
      siteFiles[`${ORIGIN}/plain.xml`] = toSitemap([`${ORIGIN}/from-plain`]);
      [...toNested('nested-a'), ...toNested('nested-b')].forEach((sitemapUrl) => {
        siteFiles[sitemapUrl] = toSitemap([sitemapUrl.replace('.xml', '/page')]);
      });
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls });

      expect(getSiteFileRequests()).toEqual([
        ROBOTS_URL,
        ...sitemapUrls,
        SITEMAP_URL,
        ...toNested('nested-a').slice(0, 3),
      ]);
      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/from-plain`,
        `${ORIGIN}/nested-a-0/page`,
        `${ORIGIN}/nested-a-1/page`,
        `${ORIGIN}/nested-a-2/page`,
      ]);
    });

    it('does not take the requests for the explicit sitemaps from those of the sites', async () => {
      const declared = Array.from(
        { length: 5 },
        (_, sitemap) => `${ORIGIN}/declared-${sitemap}.xml`
      );
      const sitemapUrls = Array.from(
        { length: 4 },
        (_, sitemap) => `${ORIGIN}/explicit-${sitemap}.xml`
      );
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
      ).resolves.toEqual({
        documentsCount: 5,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getSiteFileRequests()).toEqual([
        ROBOTS_URL,
        OTHER_ROBOTS_URL,
        sitemapUrl,
        SITEMAP_URL,
        OTHER_SITEMAP_URL,
      ]);
      expect(getPageRequests()).toEqual([
        SEED_URL,
        OTHER_SEED_URL,
        `${ORIGIN}/listed-a`,
        `${OTHER_ORIGIN}/listed-b`,
        'https://www.docs.example.org/listed-d',
      ]);
    });

    it('does not crawl the pages of the site that hosts an explicit sitemap when the crawl does not start there', async () => {
      siteFiles[OTHER_SITEMAP_URL] = toSitemap([`${OTHER_ORIGIN}/listed-b`, `${ORIGIN}/listed-a`]);
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls: [OTHER_SITEMAP_URL] });

      expect(getSiteFileRequests()).toEqual([ROBOTS_URL, OTHER_SITEMAP_URL, SITEMAP_URL]);
      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/listed-a`]);
    });

    it('applies the robots.txt of each site and the path rules to the pages they list', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /private';
      siteFiles[OTHER_ROBOTS_URL] = 'User-agent: *\nDisallow: /internal';
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
      ).resolves.toEqual({
        documentsCount: 4,
        failedCount: 0,
        skippedByRobotsCount: 2,
        skippedByRulesCount: 1,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([
        SEED_URL,
        OTHER_SEED_URL,
        `${ORIGIN}/internal/a`,
        `${OTHER_ORIGIN}/private/b`,
      ]);
    });

    it('crawls a page once when an explicit sitemap, the sitemap of its site and a start page all list it', async () => {
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/shared`, SEED_URL, `${ORIGIN}/a`]);
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/shared`, `${ORIGIN}/a`]);
      mockSite({
        [SEED_URL]: pageLinkingTo(['/a']),
        [`${ORIGIN}/a`]: pageLinkingTo([]),
        [`${ORIGIN}/shared`]: pageLinkingTo([]),
      });

      await crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/a`, `${ORIGIN}/shared`]);
      expect(getIndexedDepths()).toEqual({
        [SEED_URL]: 0,
        [`${ORIGIN}/a`]: 1,
        [`${ORIGIN}/shared`]: 1,
      });
    });

    it('reads an explicit sitemap whose URL does not look like one, without indexing it', async () => {
      const sitemapUrl = `${ORIGIN}/feeds/pages`;
      mockSite({
        [SEED_URL]: pageLinkingTo([]),
        [sitemapUrl]: { content: toSitemap([`${ORIGIN}/from-feed`]) },
        [`${ORIGIN}/from-feed`]: pageLinkingTo([]),
      });

      await expect(crawl({ sitemapUrls: [sitemapUrl] })).resolves.toEqual(
        expect.objectContaining({ documentsCount: 2, failedCount: 0 })
      );

      expect(getIndexedDocuments().map(({ url }) => url)).toEqual([
        SEED_URL,
        `${ORIGIN}/from-feed`,
      ]);
    });

    it.each<[string, string | Error | undefined]>([
      ['cannot be read', new Error('sitemap unavailable')],
      ['is missing', undefined],
      ['lists nothing', toSitemap([])],
    ])('crawls the site and its own sitemap when an explicit sitemap %s', async (_, sitemap) => {
      siteFiles[EXPLICIT_SITEMAP_URL] = sitemap;
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/from-site`]);
      mockPages(() => pageLinkingTo([]));

      await expect(crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] })).resolves.toEqual({
        documentsCount: 2,
        failedCount: 0,
        skippedByRobotsCount: 0,
        skippedByRulesCount: 0,
        purgedCount: 0,
        aborted: false,
      });

      expect(getPageRequests()).toEqual([SEED_URL, `${ORIGIN}/from-site`]);
    });

    it.each([
      ['the maximum depth is 0', { maxDepth: 0 }],
      ['only one document may be crawled', { maxDocuments: 1 }],
    ])('does not read them when %s', async (_, limits) => {
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL], ...limits });

      expect(getRequestedUrls()).toEqual([ROBOTS_URL, SEED_URL]);
    });

    it('does not count the explicit sitemap requests against the page budget, and never requests more pages than it', async () => {
      const sitemapUrls = [`${ORIGIN}/explicit-1.xml`, `${ORIGIN}/explicit-2.xml`];
      siteFiles[sitemapUrls[0]] = toSitemap(
        Array.from({ length: 10 }, (_, page) => `${ORIGIN}/first-${page}`)
      );
      siteFiles[sitemapUrls[1]] = toSitemap(
        Array.from({ length: 10 }, (_, page) => `${ORIGIN}/second-${page}`)
      );
      mockPages(() => pageLinkingTo([]));

      await expect(crawl({ sitemapUrls, maxDocuments: 4 })).resolves.toEqual(
        expect.objectContaining({ documentsCount: 4 })
      );

      expect(getPageRequests()).toEqual([
        SEED_URL,
        `${ORIGIN}/first-0`,
        `${ORIGIN}/first-1`,
        `${ORIGIN}/first-2`,
      ]);
    });

    it('queues their pages only once every start page was crawled', async () => {
      const releaseOtherSeed = hold(OTHER_SEED_URL);
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      mockPages(() => pageLinkingTo([]));

      const crawling = crawl({
        additionalSeedUrls: [OTHER_SEED_URL],
        sitemapUrls: [EXPLICIT_SITEMAP_URL],
      });
      await letCrawlRun();

      expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL]);

      releaseOtherSeed();
      await crawling;

      expect(getPageRequests()).toEqual([SEED_URL, OTHER_SEED_URL, `${ORIGIN}/from-explicit`]);
    });

    it('reads them on the signal of the sitemaps, which is aborted once the crawl is done', async () => {
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      mockPages(() => pageLinkingTo([]));

      await crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] });

      const getSignal = (requestedUrl: string): AbortSignal | undefined =>
        mockExtractPage.mock.calls.find(([, { url }]) => url === requestedUrl)?.[1].signal;
      expect(getSignal(EXPLICIT_SITEMAP_URL)).toBe(getSignal(SITEMAP_URL));
      expect(getSignal(EXPLICIT_SITEMAP_URL)).not.toBe(getSignal(SEED_URL));
      expect(getSignal(EXPLICIT_SITEMAP_URL)?.aborted).toBe(true);
    });

    it('stops when the signal is aborted while only an explicit sitemap is still being read', async () => {
      hold(EXPLICIT_SITEMAP_URL);
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      mockPages(() => pageLinkingTo([]));

      const crawling = crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] });
      await waitUntil(() => getIndexedDocuments().length === 1);
      abortController.abort();

      await expect(crawling).resolves.toEqual(
        expect.objectContaining({ documentsCount: 1, aborted: true })
      );
      expect(getPageRequests()).toEqual([SEED_URL]);
    });

    it('deletes the outdated pages when the whole of the sites and of the explicit sitemaps was crawled', async () => {
      siteFiles[EXPLICIT_SITEMAP_URL] = toSitemap([`${ORIGIN}/from-explicit`]);
      mockPages(() => pageLinkingTo([]));
      esClient.deleteByQuery.mockResolvedValue({ deleted: 3 });

      await expect(crawl({ sitemapUrls: [EXPLICIT_SITEMAP_URL] })).resolves.toEqual(
        expect.objectContaining({ documentsCount: 2, purgedCount: 3 })
      );
    });
  });
});
