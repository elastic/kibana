/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createBulkIndexer } from './bulk_indexer';
import { extractPage, waitFor } from './document_extraction';
import {
  MAX_LINKS_PER_PAGE,
  extractLinks,
  getPageKey,
  getSiteKey,
  getUrlFields,
  normalizeUrl,
} from './links';
import type { PathRules } from './path_rules';
import { NO_PATH_RULES, isPathAllowed } from './path_rules';
import { purgeStaleDocuments } from './purge';
import type { RobotsRules } from './robots';
import { ALLOW_ALL_ROBOTS, parseRobotsTxt } from './robots';
import { MAX_SITEMAP_REQUESTS, discoverSitemapPages } from './sitemap';

export const EXTRACTION_CONCURRENCY = 10;
const MAX_CONTENT_LENGTH = 500_000;
export const CRAWL_LIMITS = {
  /** Bounds memory: max combined length of the URLs a crawl remembers */
  maxSeenUrlsLength: 10_000_000,
  /** Max origins, besides those of the start URLs, that we read robots.txt for */
  maxLinkedOrigins: 50,
};
// Pages are fetched by the inference endpoint, so this only selects which robots.txt group applies.
export const ROBOTS_USER_AGENT = 'Elastic-Crawler';
const ROBOTS_CHECKS_PER_TICK = 100;
// With a longer delay the largest crawl wouldn't fit in the task timeout
export const MAX_CRAWL_DELAY_MS = 3_000;

export interface CrawlProgress {
  documentsCount: number;
  failedCount: number;
  /** Pages handed to the inference endpoint so far, whether or not they came back. */
  requestedCount: number;
  queuedCount: number;
  skippedByRobotsCount: number;
  skippedByRulesCount: number;
}

export interface CrawlOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  url: string;
  additionalSeedUrls?: string[];
  sitemapUrls?: string[];
  indexName: string;
  inferenceId: string;
  crawlId: string;
  maxDepth: number;
  maxDocuments: number;
  /** Only applies to discovered links. Start URLs are always crawled. */
  pathRules?: PathRules;
  fileExtensions?: readonly string[];
  /** Called synchronously on every count change */
  onProgress?: (progress: CrawlProgress) => void;
}

export interface CrawlResult {
  documentsCount: number;
  failedCount: number;
  skippedByRobotsCount: number;
  skippedByRulesCount: number;
  purgedCount: number;
  aborted: boolean;
}

interface QueuedPage {
  pageUrl: string;
  depth: number;
}

// Depth for known URLs that aren't pages, like sitemaps
const NOT_A_PAGE = -1;

// Crawls with the same start URLs, sitemaps and path rules share a scope and can purge each other's
// documents. URLs are compared as given, because another URL of the same page can lead to different
// links, robots.txt and sitemaps.
const getCrawlScope = (
  seedUrls: string[],
  sitemapUrls: string[],
  { includePaths, excludePaths }: PathRules
): string =>
  createHash('sha256')
    .update(
      JSON.stringify(
        [seedUrls, sitemapUrls, includePaths, excludePaths].map((values) =>
          [...new Set(values)].sort()
        )
      )
    )
    .digest('hex');

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const isHighSurrogate = (charCode: number): boolean => charCode >= 0xd800 && charCode <= 0xdbff;

const truncateContent = (content: string): string => {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content;
  }
  const end = isHighSurrogate(content.charCodeAt(MAX_CONTENT_LENGTH - 1))
    ? MAX_CONTENT_LENGTH - 1
    : MAX_CONTENT_LENGTH;
  return content.slice(0, end);
};

/**
 * Crawls one or more sites and indexes every extracted page.
 *
 * A fixed number of workers pull pages from a queue that hands out the shallowest page first, so
 * the crawl stays close to breadth-first. Indexing runs alongside extraction. At most
 * `maxDocuments` pages are requested.
 *
 * At most `maxDocuments` pages are requested, so that is also the ceiling on indexed documents.
 * The crawl starts from one or more pages, and stays on the sites those pages are on. The
 * robots.txt of every site is read first and honoured for its pages, as is the pause between
 * requests it asks for, up to a limit. A site whose robots.txt request fails is not crawled, and its
 * start URLs count as failed. The sitemaps are read while the seed page
 * is crawled, and the pages they list join the links of the seed page at depth 1. Pages,
 * robots.txt and sitemaps are all fetched by the inference endpoint; the work left on this process
 * is parsing, which yields to the event loop as it goes.
 *
 * A crawl that read the whole site without a failure ends by deleting the documents of earlier
 * crawls that it did not find again. A crawl that failed on a page, hit a limit or was stopped
 * deletes nothing.
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
  fileExtensions = [],
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

  // Aborts with the task, or when indexing fails
  const crawlAbort = new AbortController();
  const { signal } = crawlAbort;
  const abortCrawl = () => crawlAbort.abort();
  taskSignal.addEventListener('abort', abortCrawl, { once: true });

  const startedAt = new Date().toISOString();
  // Depth each page was found at. Keyed by page so we crawl it once, unless we find it again closer
  // to a start URL.
  const depthByPage = new Map<string, number>();
  const givenSeedUrls = [url, ...additionalSeedUrls];
  givenSeedUrls.forEach((seedUrl) => depthByPage.set(getPageKey(seedUrl), 0));
  const crawlScope = getCrawlScope(givenSeedUrls, sitemapUrls, pathRules);
  // Don't crawl sitemaps and robots.txt as pages, unless they're start URLs
  const markNotAPage = (fileUrl: string) => {
    const pageKey = getPageKey(fileUrl);
    if (!depthByPage.has(pageKey)) {
      depthByPage.set(pageKey, NOT_A_PAGE);
    }
  };
  sitemapUrls.forEach(markNotAPage);
  // Links rejected by path rules or robots.txt. Keyed by URL, since another URL of the same page
  // may be allowed.
  const skippedUrls = new Set<string>();
  let seenUrlsLength = 0;
  // Set when links were dropped because of a limit. The crawl is then incomplete and doesn't purge.
  let hasDroppedLinks = false;
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
      // An unreadable sitemap may list pages we never find
      if (!fetchSignal.aborted) {
        hasDroppedLinks = true;
      }
      logger.debug(`Web crawl could not read ${contentUrl}: ${error.message}`);
      return undefined;
    }
  };

  try {
    // robots.txt is per origin (scheme, host and port). No content means no rules. If the request
    // fails we don't know the rules, so we skip the origin.
    const robotsByOrigin = new Map<string, RobotsRules | null>();
    const robotsRequests = new Map<string, Promise<RobotsRules | null>>();
    const robotsErrorByOrigin = new Map<string, Error>();
    let linkedOriginsCount = 0;
    const readRobots = (
      pageUrl: string,
      { isLinked = false }: { isLinked?: boolean } = {}
    ): Promise<RobotsRules | null> => {
      const { origin } = new URL(pageUrl);
      const pending = robotsRequests.get(origin);
      if (pending) {
        return pending;
      }
      // A site can link to any number of ports, and each is its own origin
      if (isLinked && ++linkedOriginsCount > CRAWL_LIMITS.maxLinkedOrigins) {
        if (linkedOriginsCount === CRAWL_LIMITS.maxLinkedOrigins + 1) {
          logger.warn(
            `Web crawl of ${url} leaves out the pages of ${origin} and of further origins: it reads the robots.txt of at most ${CRAWL_LIMITS.maxLinkedOrigins} origins that pages link to`
          );
        }
        return Promise.resolve(null);
      }
      const robotsUrl = `${origin}/robots.txt`;
      markNotAPage(robotsUrl);
      const request = extractPage(esClient, { inferenceId, url: robotsUrl, signal })
        .then((robots) => {
          const rules = robots
            ? parseRobotsTxt(robots.content, ROBOTS_USER_AGENT)
            : ALLOW_ALL_ROBOTS;
          if (rules.isTruncated) {
            logger.warn(
              `Web crawl read only the first rules of ${robotsUrl}, which has more than it keeps`
            );
          }
          return rules;
        })
        .catch((error) => {
          // Aborted, so nothing more is requested anyway
          if (signal.aborted) {
            return ALLOW_ALL_ROBOTS;
          }
          robotsErrorByOrigin.set(origin, error);
          logger.warn(`Web crawl could not read ${robotsUrl}: ${error.message}`);
          return null;
        })
        .then((rules) => {
          robotsByOrigin.set(origin, rules);
          return rules;
        });
      robotsRequests.set(origin, request);
      return request;
    };
    const getRobots = (pageUrl: string): RobotsRules =>
      robotsByOrigin.get(new URL(pageUrl).origin) ?? ALLOW_ALL_ROBOTS;

    await Promise.all(givenSeedUrls.map((seedUrl) => readRobots(seedUrl)));
    const isReadable = (seedUrl: string): boolean =>
      robotsByOrigin.get(new URL(seedUrl).origin) !== null;
    const isAllowedSeed = (seedUrl: string): boolean =>
      isReadable(seedUrl) && getRobots(seedUrl).isAllowed(seedUrl);
    // If several start URLs lead to the same page, use the first one we're allowed to crawl
    const seedByPage = new Map<string, string>();
    for (const seedUrl of givenSeedUrls) {
      const pageKey = getPageKey(seedUrl);
      const chosen = seedByPage.get(pageKey);
      if (chosen === undefined || (!isAllowedSeed(chosen) && isAllowedSeed(seedUrl))) {
        seedByPage.set(pageKey, seedUrl);
      }
    }
    const seedUrls = [...seedByPage.values()];
    const readableSeedUrls = seedUrls.filter(isReadable);
    // Per site: the first start URL, where we look for sitemaps, and the sitemaps declared in the
    // robots.txt of any of its start URLs
    const siteSeeds = new Map<string, string>();
    const declaredSitemapsBySite = new Map<string, Set<string>>();
    for (const seedUrl of givenSeedUrls.filter(isReadable)) {
      const siteKey = getSiteKey(seedUrl);
      if (!siteSeeds.has(siteKey)) {
        siteSeeds.set(siteKey, seedUrl);
        declaredSitemapsBySite.set(siteKey, new Set());
      }
      for (const sitemap of getRobots(seedUrl).sitemaps) {
        const sitemapUrl = normalizeUrl(sitemap, seedUrl, { isDiscovered: false });
        if (sitemapUrl) {
          declaredSitemapsBySite.get(siteKey)?.add(sitemapUrl);
        }
      }
    }
    const allowedSeedUrls = readableSeedUrls.filter(isAllowedSeed);
    if (allowedSeedUrls.length === 0) {
      const [unreadableOrigin] = robotsErrorByOrigin;
      if (unreadableOrigin) {
        const [origin, error] = unreadableOrigin;
        throw new Error(
          `The robots.txt of ${getSiteKey(origin)} could not be read: ${error.message}`
        );
      }
      throw new Error(
        seedUrls.length === 1
          ? `The site's robots.txt does not allow crawling ${url}`
          : 'The robots.txt of the sites does not allow crawling any of the start URLs'
      );
    }
    skippedByRobotsCount += readableSeedUrls.length - allowedSeedUrls.length;
    extractionFailedCount += seedUrls.length - readableSeedUrls.length;
    // A start URL was replaced by another URL of the same page, but its origin is still unreadable
    if (!givenSeedUrls.every(isReadable)) {
      hasDroppedLinks = true;
    }
    queues[0].push(...allowedSeedUrls);

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
        const pageKey = getPageKey(link);
        const isKnown = (): boolean =>
          (depthByPage.get(pageKey) ?? Infinity) <= depth || skippedUrls.has(link);
        if (isKnown()) {
          continue;
        }
        // Don't queue more than we can still request. Stale entries count here but are never
        // requested, so the crawl can still end under budget.
        if (queue.length - queueCursors[depth] >= maxDocuments - requestedCount) {
          hasDroppedLinks = true;
          break;
        }
        if (seenUrlsLength + link.length > CRAWL_LIMITS.maxSeenUrlsLength) {
          hasDroppedLinks = true;
          break;
        }
        let robots: RobotsRules | null | undefined;
        if (isPathAllowed(link, pathRules)) {
          robots = robotsByOrigin.get(new URL(link).origin);
          if (robots === undefined) {
            robots = await readRobots(link, { isLinked: true });
            // Another worker may have queued or skipped the link while we waited for robots.txt
            if (isKnown()) {
              continue;
            }
          }
        }
        const knownDepth = depthByPage.get(pageKey);
        if (robots === null) {
          hasDroppedLinks = true;
          continue;
        }
        if (robots?.isAllowed(link)) {
          // Found again closer to a start URL: queue it again so its links are followed further
          if (knownDepth === undefined) {
            seenUrlsLength += pageKey.length;
          }
          depthByPage.set(pageKey, depth);
          queue.push(link);
        } else {
          skippedUrls.add(link);
          seenUrlsLength += link.length;
          if (robots) {
            skippedByRobotsCount++;
          } else {
            skippedByRulesCount++;
          }
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
        while (queueCursors[depth] < queues[depth].length) {
          const pageUrl = queues[depth][queueCursors[depth]++];
          // Skip entries that were queued again at a shallower depth
          if (depthByPage.get(getPageKey(pageUrl)) === depth) {
            requestedCount++;
            return { pageUrl, depth };
          }
        }
      }
      return undefined;
    };

    let markSeedsCrawled: () => void = () => {};
    const seedsCrawled = new Promise<void>((resolve) => {
      markSeedsCrawled = resolve;
    });
    // Start URLs beyond the page limit are never requested, so don't wait for them
    let pendingSeedCount = Math.min(allowedSeedUrls.length, maxDocuments);
    signal.addEventListener('abort', markSeedsCrawled, { once: true });
    // The abort may have happened before the listener was added
    if (signal.aborted) {
      markSeedsCrawled();
    }

    const crawlPage = async ({ pageUrl, depth }: QueuedPage) => {
      const crawlDelayMs = Math.min(getRobots(pageUrl).crawlDelayMs ?? 0, MAX_CRAWL_DELAY_MS);
      const waitForSlot =
        crawlDelayMs > 0 ? () => waitForRequestSlot(getSiteKey(pageUrl), crawlDelayMs) : undefined;
      if (waitForSlot) {
        await waitForSlot();
        if (signal.aborted) {
          return;
        }
      }
      let page;
      try {
        page = await extractPage(esClient, {
          inferenceId,
          url: pageUrl,
          signal,
          // Retries are requests to the site too, so they also wait for a slot
          beforeRetry: waitForSlot,
        });
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
      // If the page was found closer to a start URL in the meantime, it's crawled again from there.
      // Still index it here, at that depth, in case that request fails.
      const pageKey = getPageKey(pageUrl);
      const getKnownDepth = (): number => depthByPage.get(pageKey) ?? depth;

      // Queue links before indexing so idle workers can start on them
      if (getKnownDepth() === depth && depth < maxDepth) {
        const links = extractLinks(page.content, pageUrl, fileExtensions);
        if (links.length >= MAX_LINKS_PER_PAGE) {
          hasDroppedLinks = true;
        }
        await enqueue(links, depth + 1);
      }

      await indexer.add({
        url: pageUrl,
        title: page.title ?? pageUrl,
        description: page.description,
        content: truncateContent(page.content),
        // Read late: the depth may have changed while links were queued
        depth: getKnownDepth(),
        crawl_id: crawlId,
        crawl_scope: crawlScope,
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

    // Aborts with the crawl, and when the workers finish: by then there's no budget left for pages
    // from a sitemap that's still being read
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
          fileExtensions,
          signal: sitemapAbort.signal,
          fetchContent: (sitemapUrl: string) => fetchContent(sitemapUrl, sitemapAbort.signal),
          onIncomplete: () => {
            hasDroppedLinks = true;
          },
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
            ...[...siteSeeds.values()].map((seedUrl) =>
              discoverSitemapPages({
                ...discovery,
                siteUrl: seedUrl,
                declaredSitemaps: [...(declaredSitemapsBySite.get(getSiteKey(seedUrl)) ?? [])],
              })
            ),
          ])
        ).flat();
        await seedsCrawled;
        if (!sitemapAbort.signal.aborted) {
          await enqueue(sitemapPages, 1);
        }
      } catch (error) {
        if (!sitemapAbort.signal.aborted) {
          hasDroppedLinks = true;
        }
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
      !hasDroppedLinks &&
      requestedCount < maxDocuments;
    if (sawWholeSite) {
      try {
        purgedCount = await purgeStaleDocuments({
          esClient,
          signal,
          indexName,
          crawlId,
          crawlScope,
          startedAt,
          maxDepth,
          pathRules,
          // Only purge sites we actually crawled
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
