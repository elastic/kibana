/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createBulkIndexer } from './bulk_indexer';
import { extractPage } from './document_extraction';
import { extractLinks } from './links';
import type { RobotsRules } from './robots';
import { ALLOW_ALL_ROBOTS, parseRobotsTxt } from './robots';
import { discoverSitemapPages } from './sitemap';

export const EXTRACTION_CONCURRENCY = 10;
const MAX_CONTENT_LENGTH = 500_000;
// Pages are fetched by the inference endpoint, so this only selects which robots.txt group applies.
export const ROBOTS_USER_AGENT = 'Elastic-Crawler';
const ROBOTS_CHECKS_PER_TICK = 100;

export interface CrawlProgress {
  documentsCount: number;
  failedCount: number;
  /** Pages handed to the inference endpoint so far, whether or not they came back. */
  requestedCount: number;
  /** Pages found and waiting for a free extraction slot. */
  queuedCount: number;
}

export interface CrawlOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  url: string;
  indexName: string;
  inferenceId: string;
  crawlId: string;
  maxDepth: number;
  maxDocuments: number;
  /** Called synchronously whenever the counts change, so it has to be cheap. */
  onProgress?: (progress: CrawlProgress) => void;
}

export interface CrawlResult {
  documentsCount: number;
  failedCount: number;
  aborted: boolean;
}

interface QueuedPage {
  pageUrl: string;
  depth: number;
}

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Crawls a site and indexes every extracted page.
 *
 * A fixed number of workers pull pages from a queue that always hands out the shallowest page
 * found so far, so the crawl stays close to breadth-first without one slow page holding up a whole
 * depth level. Indexing runs alongside extraction rather than in between it.
 *
 * At most `maxDocuments` pages are requested, so that is also the ceiling on indexed documents.
 * robots.txt is read first and honoured for every page. The sitemaps are read while the seed page
 * is crawled, and the pages they list join the links of the seed page at depth 1. Pages,
 * robots.txt and sitemaps are all fetched by the inference endpoint; the work left on this process
 * is parsing, which yields to the event loop as it goes.
 */
export const crawlSite = async ({
  esClient,
  logger,
  signal: taskSignal,
  url,
  indexName,
  inferenceId,
  crawlId,
  maxDepth,
  maxDocuments,
  onProgress,
}: CrawlOptions): Promise<CrawlResult> => {
  if (taskSignal.aborted) {
    return { documentsCount: 0, failedCount: 0, aborted: true };
  }

  // Aborted with the task, and on an indexing error that makes further requests pointless.
  const crawlAbort = new AbortController();
  const { signal } = crawlAbort;
  const abortCrawl = () => crawlAbort.abort();
  taskSignal.addEventListener('abort', abortCrawl, { once: true });

  const seen = new Set<string>([url]);
  const queues: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  const queueCursors: number[] = queues.map(() => 0);
  queues[0].push(url);
  let idleWorkers: Array<() => void> = [];
  let requestedCount = 0;
  let inFlightCount = 0;
  let isDiscoveringSitemaps = false;
  let extractionFailedCount = 0;
  let lastPageError: Error | undefined;
  let fatalError: Error | undefined;

  const wakeWorkers = () => {
    const resolvers = idleWorkers;
    idleWorkers = [];
    resolvers.forEach((resolve) => resolve());
  };
  signal.addEventListener('abort', wakeWorkers, { once: true });

  const getQueuedCount = (): number =>
    queues.reduce((total, queue, depth) => total + queue.length - queueCursors[depth], 0);

  const indexer = createBulkIndexer({
    esClient,
    logger,
    signal,
    indexName,
    onIndexed: () => reportProgress(),
    onError: (error) => {
      if (!signal.aborted) {
        fatalError = error;
        abortCrawl();
      }
    },
  });

  const reportProgress = () => {
    if (!onProgress) {
      return;
    }
    const { documentsCount, failedCount } = indexer.getCounts();
    try {
      onProgress({
        documentsCount,
        failedCount: failedCount + extractionFailedCount,
        requestedCount,
        queuedCount: Math.min(getQueuedCount(), maxDocuments - requestedCount),
      });
    } catch (error) {
      logger.debug(`Web crawl progress could not be reported: ${error.message}`);
    }
  };

  const fetchContent = async (
    contentUrl: string,
    fetchSignal: AbortSignal = signal
  ): Promise<string | undefined> => {
    try {
      const page = await extractPage(esClient, {
        inferenceId,
        url: contentUrl,
        signal: fetchSignal,
      });
      return page?.content;
    } catch (error) {
      logger.debug(`Web crawl could not read ${contentUrl}: ${error.message}`);
      return undefined;
    }
  };

  try {
    // A robots.txt that cannot be read is treated as absent, which allows everything.
    const robotsUrl = new URL('/robots.txt', url).href;
    seen.add(robotsUrl);
    const robotsContent = await fetchContent(robotsUrl);
    const robots: RobotsRules = robotsContent
      ? parseRobotsTxt(robotsContent, ROBOTS_USER_AGENT)
      : ALLOW_ALL_ROBOTS;

    if (!robots.isAllowed(url)) {
      throw new Error(`The site's robots.txt does not allow crawling ${url}`);
    }

    const enqueue = async (links: string[], depth: number) => {
      const queue = queues[depth];
      let checks = 0;
      for (const link of links) {
        // Pages past the request budget would never be taken, so they are not worth remembering.
        if (queue.length - queueCursors[depth] >= maxDocuments - requestedCount) {
          break;
        }
        if (seen.has(link)) {
          continue;
        }
        seen.add(link);
        if (robots.isAllowed(link)) {
          queue.push(link);
        }
        if (++checks % ROBOTS_CHECKS_PER_TICK === 0) {
          await yieldToEventLoop();
        }
      }
      wakeWorkers();
    };

    const takeNextPage = (): QueuedPage | undefined => {
      if (requestedCount >= maxDocuments) {
        return undefined;
      }
      for (let depth = 0; depth <= maxDepth; depth++) {
        if (queueCursors[depth] < queues[depth].length) {
          requestedCount++;
          return { pageUrl: queues[depth][queueCursors[depth]++], depth };
        }
      }
      return undefined;
    };

    let markSeedCrawled: () => void = () => {};
    const seedCrawled = new Promise<void>((resolve) => {
      markSeedCrawled = resolve;
    });
    signal.addEventListener('abort', markSeedCrawled, { once: true });
    // An abort while robots.txt was read happened before the listener was there.
    if (signal.aborted) {
      markSeedCrawled();
    }

    const crawlPage = async ({ pageUrl, depth }: QueuedPage) => {
      let page;
      try {
        page = await extractPage(esClient, { inferenceId, url: pageUrl, signal });
      } catch (error) {
        if (!signal.aborted) {
          extractionFailedCount++;
          lastPageError = error;
          logger.debug(`Web crawl could not extract ${pageUrl}: ${error.message}`);
        }
        return;
      }
      if (!page) {
        extractionFailedCount++;
        return;
      }

      // Links are queued before the page is indexed, so idle workers start on them right away.
      if (depth < maxDepth) {
        await enqueue(extractLinks(page.content, pageUrl), depth + 1);
      }

      await indexer.add({
        url: pageUrl,
        title: page.title ?? pageUrl,
        description: page.description,
        content: page.content.slice(0, MAX_CONTENT_LENGTH),
        depth,
        crawl_id: crawlId,
        crawled_at: new Date().toISOString(),
      });
    };

    const runWorker = async () => {
      while (!signal.aborted) {
        const page = takeNextPage();
        if (page) {
          inFlightCount++;
          try {
            await crawlPage(page);
          } finally {
            inFlightCount--;
            if (page.depth === 0) {
              markSeedCrawled();
            }
            reportProgress();
            wakeWorkers();
          }
        } else if (
          requestedCount >= maxDocuments ||
          (inFlightCount === 0 && !isDiscoveringSitemaps)
        ) {
          return;
        } else {
          await new Promise<void>((resolve) => idleWorkers.push(resolve));
        }
      }
    };

    // Aborted with the crawl, and once the workers are done: a sitemap still being read by then
    // lists pages that the request budget has no room for.
    const sitemapAbort = new AbortController();
    const abortSitemaps = () => sitemapAbort.abort();
    signal.addEventListener('abort', abortSitemaps, { once: true });
    if (signal.aborted) {
      abortSitemaps();
    }

    const addSitemapPages = async () => {
      if (maxDepth < 1 || maxDocuments <= 1) {
        return;
      }
      isDiscoveringSitemaps = true;
      try {
        const sitemapPages = await discoverSitemapPages({
          siteUrl: url,
          declaredSitemaps: robots.sitemaps,
          maxPages: maxDocuments,
          signal: sitemapAbort.signal,
          fetchContent: (sitemapUrl) => fetchContent(sitemapUrl, sitemapAbort.signal),
        });
        // The links of the seed page come first, as they are what the user pointed the crawl at.
        await seedCrawled;
        if (!sitemapAbort.signal.aborted) {
          await enqueue(sitemapPages, 1);
        }
      } catch (error) {
        logger.debug(`Web crawl could not read the sitemaps of ${url}: ${error.message}`);
      } finally {
        isDiscoveringSitemaps = false;
        wakeWorkers();
      }
    };

    const sitemapPagesAdded = addSitemapPages();
    const workers = Promise.all(
      Array.from({ length: Math.min(EXTRACTION_CONCURRENCY, maxDocuments) }, runWorker)
    ).finally(abortSitemaps);
    await Promise.all([sitemapPagesAdded, workers]);
    signal.removeEventListener('abort', abortSitemaps);

    if (signal.aborted) {
      await indexer.settle();
    } else {
      await indexer.drain();
    }
  } finally {
    taskSignal.removeEventListener('abort', abortCrawl);
  }

  if (fatalError) {
    throw fatalError;
  }

  const { documentsCount, failedCount, lastError: lastIndexingError } = indexer.getCounts();
  if (documentsCount === 0 && !taskSignal.aborted) {
    throw (
      lastPageError ?? lastIndexingError ?? new Error(`No content could be extracted from ${url}`)
    );
  }

  return {
    documentsCount,
    failedCount: failedCount + extractionFailedCount,
    aborted: taskSignal.aborted,
  };
};
