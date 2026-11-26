/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSiteKey, isSameSitePage, iterateLinkTargets, normalizeUrl } from './links';

export const MAX_SITEMAP_REQUESTS = 3;
// More nested sitemaps than any request budget gets to.
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
  // The inference endpoint may return the XML converted to markdown, with each entry as a link.
  yield* iterateLinkTargets(content);
}

// The inference endpoint reads a gzipped sitemap as it reads a plain one.
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
  /** How many pages to read that are not among `knownPages`. */
  maxPages: number;
  maxSitemaps?: number;
  fileExtensions?: readonly string[];
  knownPages?: ReadonlySet<string>;
}

/**
 * Reads the same-site pages and the nested sitemaps a sitemap lists, stopping at `maxPages` new
 * pages. `isTruncated` tells that it listed more nested sitemaps than `maxSitemaps`.
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
  /** Sitemaps named by robots.txt. The conventional `/sitemap.xml` is tried when there are none. */
  declaredSitemaps: string[];
  /** The sites whose pages are collected. Defaults to the site of `siteUrl`. */
  siteKeys?: string[];
  /** How many sitemaps may be requested. */
  maxRequests?: number;
  maxPages: number;
  /** Files listed in a sitemap that count as pages. */
  fileExtensions?: readonly string[];
  signal: AbortSignal;
  fetchContent: (url: string) => Promise<string | undefined>;
  /** Called when sitemaps or pages were left unread because a budget ran out. */
  onIncomplete?: () => void;
}

/**
 * Collects the pages a site lists in its sitemaps, following sitemap indexes within a small request
 * budget. Sitemaps known at the same time are read side by side.
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
