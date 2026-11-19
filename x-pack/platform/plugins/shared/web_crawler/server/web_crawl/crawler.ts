/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createBulkIndexer } from './bulk_indexer';
import { extractPage, waitFor } from './document_extraction';
import { extractLinks, getSiteKey, getUrlFields } from './links';
import type { PathRules } from './path_rules';
import { NO_PATH_RULES, isPathAllowed } from './path_rules';
import { purgeStaleDocuments } from './purge';
import type { RobotsRules } from './robots';
import { ALLOW_ALL_ROBOTS, parseRobotsTxt } from './robots';
import { MAX_SITEMAP_REQUESTS, discoverSitemapPages } from './sitemap';

export const EXTRACTION_CONCURRENCY = 10;
const MAX_CONTENT_LENGTH = 500_000;
// Pages are fetched by the inference endpoint, so this only selects which robots.txt group applies.
export const ROBOTS_USER_AGENT = 'Elastic-Crawler';
const ROBOTS_CHECKS_PER_TICK = 100;
// A longer pause could not fit the largest crawl into the time the crawl task is given.
export const MAX_CRAWL_DELAY_MS = 3_000;

export interface CrawlProgress {
  documentsCount: number;
  failedCount: number;
  /** Pages handed to the inference endpoint so far, whether or not they came back. */
  requestedCount: number;
  /** Pages found and waiting for a free extraction slot. */
  queuedCount: number;
  /** Links not followed because robots.txt disallows them. */
  skippedByRobotsCount: number;
  /** Links not followed because of the path rules. */
  skippedByRulesCount: number;
}

export interface CrawlOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  url: string;
  /** More pages to start from, on the site of `url` or on other sites. */
  additionalSeedUrls?: string[];
  /** Sitemaps to read besides the ones the sites declare. */
  sitemapUrls?: string[];
  indexName: string;
  inferenceId: string;
  crawlId: string;
  maxDepth: number;
  maxDocuments: number;
  /** Narrow the links the crawl follows. The URL it starts from is always crawled. */
  pathRules?: PathRules;
  /** Called synchronously whenever the counts change, so it has to be cheap. */
  onProgress?: (progress: CrawlProgress) => void;
}

export interface CrawlResult {
  documentsCount: number;
  failedCount: number;
  skippedByRobotsCount: number;
  skippedByRulesCount: number;
  /** Pages of earlier crawls that were deleted because this crawl did not find them again. */
  purgedCount: number;
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
 * The crawl starts from one or more pages, and stays on the sites those pages are on. The
 * robots.txt of every site is read first and honoured for its pages, as is the pause between
 * requests it asks for, up to a limit. The sitemaps are read while the seed page
 * is crawled, and the pages they list join the links of the seed page at depth 1. Pages,
 * robots.txt and sitemaps are all fetched by the inference endpoint; the work left on this process
 * is parsing, which yields to the event loop as it goes.
 *
 * A crawl that read the whole site without a failure ends by deleting the pages earlier crawls
 * indexed and this one did not find. One that failed on a page, hit the page limit or was stopped
 * cannot tell a removed page from one it did not get to, so it deletes nothing.
 */
export const crawlSite = async ({
  esClient,
  logger,
  signal: taskSignal,
  url,
  additionalSeedUrls = [],
  sitemapUrls = [],
  indexName,
  inferenceId,
  crawlId,
  maxDepth,
  maxDocuments,
  pathRules = NO_PATH_RULES,
  onProgress,
}: CrawlOptions): Promise<CrawlResult> => {
  if (taskSignal.aborted) {
    return {
      documentsCount: 0,
      failedCount: 0,
      skippedByRobotsCount: 0,
      skippedByRulesCount: 0,
      purgedCount: 0,
      aborted: true,
    };
  }

  // Aborted with the task, and on an indexing error that makes further requests pointless.
  const crawlAbort = new AbortController();
  const { signal } = crawlAbort;
  const abortCrawl = () => crawlAbort.abort();
  taskSignal.addEventListener('abort', abortCrawl, { once: true });

  const seedUrls = [...new Set([url, ...additionalSeedUrls])];
  // The first start URL of each site, which is where that site's robots.txt and sitemap are looked for.
  const siteSeeds = new Map<string, string>();
  for (const seedUrl of seedUrls) {
    const siteKey = getSiteKey(seedUrl);
    if (!siteSeeds.has(siteKey)) {
      siteSeeds.set(siteKey, seedUrl);
    }
  }
  // Sitemaps a page links to are not pages to crawl.
  const seen = new Set<string>([...seedUrls, ...sitemapUrls]);
  const queues: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  const queueCursors: number[] = queues.map(() => 0);
  let idleWorkers: Array<() => void> = [];
  let requestedCount = 0;
  let inFlightCount = 0;
  let isDiscoveringSitemaps = false;
  let extractionFailedCount = 0;
  let skippedByRobotsCount = 0;
  let skippedByRulesCount = 0;
  let purgedCount = 0;
  const nextRequestAtBySite = new Map<string, number>();
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
        skippedByRobotsCount,
        skippedByRulesCount,
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
    const robotsBySite = new Map<string, RobotsRules>();
    await Promise.all(
      [...siteSeeds].map(async ([siteKey, seedUrl]) => {
        const robotsUrl = new URL('/robots.txt', seedUrl).href;
        seen.add(robotsUrl);
        const robotsContent = await fetchContent(robotsUrl);
        robotsBySite.set(
          siteKey,
          robotsContent ? parseRobotsTxt(robotsContent, ROBOTS_USER_AGENT) : ALLOW_ALL_ROBOTS
        );
      })
    );
    const getRobots = (pageUrl: string): RobotsRules =>
      robotsBySite.get(getSiteKey(pageUrl)) ?? ALLOW_ALL_ROBOTS;

    const allowedSeedUrls = seedUrls.filter((seedUrl) => getRobots(seedUrl).isAllowed(seedUrl));
    if (allowedSeedUrls.length === 0) {
      throw new Error(
        seedUrls.length === 1
          ? `The site's robots.txt does not allow crawling ${url}`
          : 'The robots.txt of the sites does not allow crawling any of the start URLs'
      );
    }
    skippedByRobotsCount += seedUrls.length - allowedSeedUrls.length;
    queues[0].push(...allowedSeedUrls);

    // Spaces out the requests of all workers to a site by the pause that site asked for.
    const waitForRequestSlot = async (siteKey: string, crawlDelayMs: number) => {
      const now = Date.now();
      const startAt = Math.max(now, nextRequestAtBySite.get(siteKey) ?? 0);
      nextRequestAtBySite.set(siteKey, startAt + crawlDelayMs);
      if (startAt > now) {
        await waitFor(startAt - now, signal);
      }
    };

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
        if (!isPathAllowed(link, pathRules)) {
          skippedByRulesCount++;
        } else if (!getRobots(link).isAllowed(link)) {
          skippedByRobotsCount++;
        } else {
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

    let markSeedsCrawled: () => void = () => {};
    const seedsCrawled = new Promise<void>((resolve) => {
      markSeedsCrawled = resolve;
    });
    // Start URLs past the page limit are never requested, so they are not waited for.
    let pendingSeedCount = Math.min(allowedSeedUrls.length, maxDocuments);
    signal.addEventListener('abort', markSeedsCrawled, { once: true });
    // An abort while robots.txt was read happened before the listener was there.
    if (signal.aborted) {
      markSeedsCrawled();
    }

    const crawlPage = async ({ pageUrl, depth }: QueuedPage) => {
      const crawlDelayMs = Math.min(getRobots(pageUrl).crawlDelayMs ?? 0, MAX_CRAWL_DELAY_MS);
      if (crawlDelayMs > 0) {
        await waitForRequestSlot(getSiteKey(pageUrl), crawlDelayMs);
        if (signal.aborted) {
          return;
        }
      }
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
        ...getUrlFields(pageUrl),
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
            if (page.depth === 0 && --pendingSeedCount === 0) {
              markSeedsCrawled();
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
        const discovery = {
          maxPages: maxDocuments,
          signal: sitemapAbort.signal,
          fetchContent: (sitemapUrl: string) => fetchContent(sitemapUrl, sitemapAbort.signal),
        };
        const sitemapPages = (
          await Promise.all([
            ...(sitemapUrls.length > 0
              ? [
                  discoverSitemapPages({
                    ...discovery,
                    siteUrl: url,
                    declaredSitemaps: sitemapUrls,
                    siteKeys: [...siteSeeds.keys()],
                    maxRequests: sitemapUrls.length + MAX_SITEMAP_REQUESTS,
                  }),
                ]
              : []),
            ...[...siteSeeds].map(([siteKey, seedUrl]) =>
              discoverSitemapPages({
                ...discovery,
                siteUrl: seedUrl,
                declaredSitemaps: robotsBySite.get(siteKey)?.sitemaps ?? [],
              })
            ),
          ])
        ).flat();
        // The links of the start pages come first, as they are what the user pointed the crawl at.
        await seedsCrawled;
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

    const { documentsCount: indexedCount, failedCount: indexingFailedCount } = indexer.getCounts();
    const sawWholeSite =
      !signal.aborted &&
      indexedCount > 0 &&
      extractionFailedCount === 0 &&
      indexingFailedCount === 0 &&
      requestedCount < maxDocuments;
    if (sawWholeSite) {
      try {
        purgedCount = await purgeStaleDocuments({
          esClient,
          signal,
          indexName,
          crawlId,
          maxDepth,
          // A site none of whose start URLs could be crawled was not read, so its pages stay.
          hosts: [...new Set(allowedSeedUrls.map(getSiteKey))].flatMap((siteKey) => [
            siteKey,
            `www.${siteKey}`,
          ]),
        });
      } catch (error) {
        logger.warn(
          `Web crawl of ${url} could not remove outdated pages from ${indexName}: ${error.message}`
        );
      }
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
    skippedByRobotsCount,
    skippedByRulesCount,
    purgedCount,
    aborted: taskSignal.aborted,
  };
};
