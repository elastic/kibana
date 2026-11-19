/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSiteKey, isSameSitePage, iterateLinkTargets, normalizeUrl } from './links';

export const MAX_SITEMAP_REQUESTS = 3;
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

const isSitemapUrl = (url: string): boolean => new URL(url).pathname.toLowerCase().endsWith('.xml');

export interface SitemapEntries {
  pageUrls: string[];
  sitemapUrls: string[];
}

/** Reads the same-site pages and the nested sitemaps a sitemap lists, stopping at `maxPages` pages. */
export const parseSitemap = (
  content: string,
  sitemapUrl: string,
  siteKeys: string | string[],
  maxPages: number
): SitemapEntries => {
  const allowedSiteKeys = [siteKeys].flat();
  const pageUrls = new Set<string>();
  const sitemapUrls = new Set<string>();

  for (const entry of iterateSitemapEntries(content)) {
    if (pageUrls.size >= maxPages) {
      break;
    }
    const url = entry.length > 0 ? normalizeUrl(entry, sitemapUrl) : null;
    if (!url) {
      continue;
    }
    if (isSitemapUrl(url)) {
      sitemapUrls.add(url);
    } else if (allowedSiteKeys.some((siteKey) => isSameSitePage(url, siteKey))) {
      pageUrls.add(url);
    }
  }

  return { pageUrls: [...pageUrls], sitemapUrls: [...sitemapUrls] };
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
  signal: AbortSignal;
  fetchContent: (url: string) => Promise<string | undefined>;
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
  signal,
  fetchContent,
}: DiscoverSitemapPagesOptions): Promise<string[]> => {
  const declared = declaredSitemaps
    .map((sitemap) => normalizeUrl(sitemap, siteUrl, { isDiscovered: false }))
    .filter((sitemap): sitemap is string => sitemap !== null);
  const queue = declared.length > 0 ? declared : [new URL('/sitemap.xml', siteUrl).href];
  const requested = new Set<string>();
  const pages = new Set<string>();

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
      const { pageUrls, sitemapUrls } = parseSitemap(
        content,
        batch[position],
        siteKeys,
        maxPages - pages.size
      );
      pageUrls.forEach((pageUrl) => pages.add(pageUrl));
      queue.push(...sitemapUrls);
    });
  }

  return [...pages];
};
