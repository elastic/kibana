/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSiteKey, isSameSitePage, iterateLinkTargets, normalizeUrl } from './links';

export const MAX_SITEMAP_REQUESTS = 3;
// More than any request budget can reach
const MAX_NESTED_SITEMAPS = 1000;
const NO_PAGES: ReadonlySet<string> = new Set();
const LOC_OPEN = '<loc>';
const LOC_CLOSE = '</loc>';

const CDATA_OPEN = '<![CDATA[';
const CDATA_CLOSE = ']]>';

const decodeLocValue = (rawValue: string): string => {
  const value = rawValue.trim();
  if (value.startsWith(CDATA_OPEN) && value.endsWith(CDATA_CLOSE)) {
    return value.slice(CDATA_OPEN.length, -CDATA_CLOSE.length).trim();
  }
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
};

function* iterateLocTags(content: string): Generator<string> {
  let cursor = 0;
  while (true) {
    const openIndex = content.indexOf(LOC_OPEN, cursor);
    if (openIndex === -1) {
      return;
    }
    const valueStart = openIndex + LOC_OPEN.length;
    const closeIndex = content.indexOf(LOC_CLOSE, valueStart);
    if (closeIndex === -1) {
      return;
    }
    cursor = closeIndex + LOC_CLOSE.length;
    yield decodeLocValue(content.slice(valueStart, closeIndex));
  }
}

function* iterateSitemapEntries(content: string): Generator<string> {
  yield* iterateLocTags(content);
  // The inference endpoint may return the XML as markdown, with each entry as a link
  yield* iterateLinkTargets(content);
}

// The inference endpoint can read gzipped sitemaps
const isSitemapUrl = (url: string): boolean => {
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.endsWith('.xml') || pathname.endsWith('.xml.gz');
};

export interface SitemapEntries {
  pageUrls: string[];
  sitemapUrls: string[];
  isTruncated: boolean;
}

interface ParseSitemapOptions {
  siteKeys: string[];
  /** Max pages that aren't in `knownPages` yet */
  maxPages: number;
  maxSitemaps?: number;
  fileExtensions?: readonly string[];
  knownPages?: ReadonlySet<string>;
}

/**
 * Reads the same-site pages and nested sitemaps from a sitemap. `isTruncated` means it had more
 * nested sitemaps than `maxSitemaps`.
 */
export const parseSitemap = (
  content: string,
  sitemapUrl: string,
  {
    siteKeys,
    maxPages,
    maxSitemaps = MAX_NESTED_SITEMAPS,
    fileExtensions = [],
    knownPages = NO_PAGES,
  }: ParseSitemapOptions
): SitemapEntries => {
  const pageUrls = new Set<string>();
  const sitemapUrls = new Set<string>();
  let isTruncated = false;

  for (const entry of iterateSitemapEntries(content)) {
    if (pageUrls.size >= maxPages) {
      break;
    }
    const url = entry.length > 0 ? normalizeUrl(entry, sitemapUrl) : null;
    if (!url) {
      continue;
    }
    if (isSitemapUrl(url)) {
      if (sitemapUrls.size < maxSitemaps) {
        sitemapUrls.add(url);
      } else if (!sitemapUrls.has(url)) {
        isTruncated = true;
      }
    } else if (
      !knownPages.has(url) &&
      siteKeys.some((siteKey) => isSameSitePage(url, siteKey, fileExtensions))
    ) {
      pageUrls.add(url);
    }
  }

  return { pageUrls: [...pageUrls], sitemapUrls: [...sitemapUrls], isTruncated };
};

interface DiscoverSitemapPagesOptions {
  siteUrl: string;
  /** From robots.txt. Falls back to `/sitemap.xml` when empty. */
  declaredSitemaps: string[];
  siteKeys?: string[];
  maxRequests?: number;
  maxPages: number;
  fileExtensions?: readonly string[];
  signal: AbortSignal;
  fetchContent: (url: string) => Promise<string | undefined>;
  /** Called when a budget ran out before everything was read */
  onIncomplete?: () => void;
}

/**
 * Collects the pages listed in a site's sitemaps, following sitemap indexes within a small request
 * budget
 */
export const discoverSitemapPages = async ({
  siteUrl,
  declaredSitemaps,
  siteKeys = [getSiteKey(siteUrl)],
  maxRequests = MAX_SITEMAP_REQUESTS,
  maxPages,
  fileExtensions,
  signal,
  fetchContent,
  onIncomplete,
}: DiscoverSitemapPagesOptions): Promise<string[]> => {
  const declared = declaredSitemaps
    .map((sitemap) => normalizeUrl(sitemap, siteUrl, { isDiscovered: false }))
    .filter((sitemap): sitemap is string => sitemap !== null);
  const queue = declared.length > 0 ? declared : [new URL('/sitemap.xml', siteUrl).href];
  const requested = new Set<string>();
  const pages = new Set<string>();
  let hasDroppedSitemaps = false;

  while (
    queue.length > 0 &&
    requested.size < maxRequests &&
    pages.size < maxPages &&
    !signal.aborted
  ) {
    const batch: string[] = [];
    while (queue.length > 0 && requested.size < maxRequests) {
      const sitemapUrl = queue.shift();
      if (sitemapUrl !== undefined && !requested.has(sitemapUrl)) {
        requested.add(sitemapUrl);
        batch.push(sitemapUrl);
      }
    }

    const contents = await Promise.all(batch.map((sitemapUrl) => fetchContent(sitemapUrl)));
    contents.forEach((content, position) => {
      if (!content || pages.size >= maxPages) {
        return;
      }
      const { pageUrls, sitemapUrls, isTruncated } = parseSitemap(content, batch[position], {
        siteKeys,
        maxPages: maxPages - pages.size,
        fileExtensions,
        knownPages: pages,
      });
      pageUrls.forEach((pageUrl) => pages.add(pageUrl));
      sitemapUrls.forEach((sitemapUrl) => queue.push(sitemapUrl));
      hasDroppedSitemaps ||= isTruncated;
    });
  }

  const hasUnreadSitemaps = queue.some((sitemapUrl) => !requested.has(sitemapUrl));
  if (!signal.aborted && (hasUnreadSitemaps || hasDroppedSitemaps || pages.size >= maxPages)) {
    onIncomplete?.();
  }

  return [...pages];
};
