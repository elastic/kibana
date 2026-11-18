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
} from '../../common/constants';
import { BULK_SIZE, MAX_CONCURRENT_BULKS } from './bulk_indexer';
import type { CrawlProgress } from './crawler';
import { EXTRACTION_CONCURRENCY, ROBOTS_USER_AGENT, crawlSite } from './crawler';
import type { ExtractedPage } from './document_extraction';
import { extractPage } from './document_extraction';

jest.mock('./document_extraction');

const mockExtractPage = extractPage as jest.MockedFunction<typeof extractPage>;

const ORIGIN = 'https://example.com';
const SEED_URL = `${ORIGIN}/`;
const ROBOTS_URL = `${ORIGIN}/robots.txt`;
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;
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

const isSiteFile = (url: string): boolean => url === ROBOTS_URL || url.endsWith('.xml');

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

  const crawl = ({
    url = SEED_URL,
    maxDepth = WEB_CRAWL_DEFAULT_MAX_DEPTH,
    maxDocuments = WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
    onProgress,
  }: {
    url?: string;
    maxDepth?: number;
    maxDocuments?: number;
    onProgress?: (progress: CrawlProgress) => void;
  } = {}) =>
    crawlSite({
      esClient,
      logger,
      signal: abortController.signal,
      url,
      indexName: INDEX_NAME,
      inferenceId: INFERENCE_ID,
      crawlId: CRAWL_ID,
      maxDepth,
      maxDocuments,
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
        },
        {
          url: `${ORIGIN}/a`,
          title: 'A',
          description: undefined,
          content: 'No links here',
          depth: 1,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
        },
        {
          url: `${ORIGIN}/b`,
          title: 'B',
          description: undefined,
          content: 'No links here',
          depth: 1,
          crawl_id: CRAWL_ID,
          crawled_at: expect.any(String),
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
        aborted: false,
      });

      const reports = getReports(onProgress);
      expect(reports.at(-1)).toEqual({
        documentsCount: 2,
        failedCount: 3,
        requestedCount: 5,
        queuedCount: 0,
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
      });

      succeed();
      await crawling;

      expect(getReports(onProgress).at(-1)).toEqual({
        documentsCount: 3,
        failedCount: 0,
        requestedCount: 3,
        queuedCount: 0,
      });
    });
  });

  describe('depth limit', () => {
    it('does not follow the links found on pages at the maximum depth', async () => {
      mockChainSite();

      await expect(crawl()).resolves.toEqual({
        documentsCount: 3,
        failedCount: 0,
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
      crawling.then(() => {
        isDone = true;
      });
      await letCrawlRun();

      expect(isDone).toBe(false);

      succeed();

      await expect(crawling).resolves.toEqual({
        documentsCount: BULK_SIZE + 10,
        failedCount: 0,
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

  describe('abort', () => {
    it('does not request anything when the signal is already aborted', async () => {
      siteFiles[ROBOTS_URL] = 'User-agent: *\nDisallow: /';
      siteFiles[SITEMAP_URL] = toSitemap([`${ORIGIN}/a`]);
      mockSite({ [SEED_URL]: pageLinkingTo(['/a']) });
      abortController.abort();

      await expect(crawl()).resolves.toEqual({
        documentsCount: 0,
        failedCount: 0,
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
      expect(result).toEqual({ documentsCount: 2, failedCount: 0, aborted: false });
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
});
