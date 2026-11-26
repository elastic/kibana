/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebCrawlFileExtension } from '../../common/constants';
import { WEB_CRAWL_FILE_EXTENSIONS } from '../../common/constants';

const MAX_URL_LENGTH = 2048;
// Deeper paths and longer queries are mostly calendars, faceted listings and other URL traps.
const MAX_URL_SEGMENTS = 16;
const MAX_URL_PARAMS = 10;
export const MAX_LINKS_PER_PAGE = 2000;
const LINK_TARGET_OPEN = '](';

const SKIPPED_EXTENSIONS = new Set([
  '7z',
  'avi',
  'bmp',
  'css',
  'csv',
  'dmg',
  'doc',
  'docx',
  'exe',
  'gif',
  'gz',
  'ico',
  'jpeg',
  'jpg',
  'js',
  'json',
  'mov',
  'mp3',
  'mp4',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'rss',
  'svg',
  'tar',
  'tgz',
  'webm',
  'webp',
  'woff',
  'woff2',
  'xls',
  'xlsx',
  'xml',
  'zip',
]);

const getPathSegments = (pathname: string): string[] =>
  pathname.split('/').filter((segment) => segment !== '');

/**
 * Returns the absolute http(s) URL without fragment or credentials, or `null` when it is not
 * crawlable. `isDiscovered` is for links a crawl came across, which are also held to the limits
 * that keep it out of URL traps; the URL a user asks for is not.
 */
export const normalizeUrl = (
  rawUrl: string,
  baseUrl?: string,
  { isDiscovered = true }: { isDiscovered?: boolean } = {}
): string | null => {
  if (rawUrl.length > MAX_URL_LENGTH) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawUrl, baseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  if (
    isDiscovered &&
    (getPathSegments(url.pathname).length > MAX_URL_SEGMENTS ||
      [...url.searchParams.keys()].length > MAX_URL_PARAMS)
  ) {
    return null;
  }

  url.hash = '';
  url.username = '';
  url.password = '';

  return url.href.length > MAX_URL_LENGTH ? null : url.href;
};

/** Identifies the site a URL belongs to, treating the `www.` host as the bare host. */
export const getSiteKey = (url: string): string => new URL(url).hostname.replace(/^www\./, '');

/**
 * Identifies the page a URL leads to: the `http` and `https` URLs of a page are one page, and so
 * are its URLs with and without a trailing slash.
 */
export const getPageKey = (url: string): string => {
  const { host, pathname, search } = new URL(url);
  return `${host}${pathname.endsWith('/') ? pathname.slice(0, -1) : pathname}${search}`;
};

export interface UrlFields {
  url_host: string;
  url_path: string;
  url_path_dir1?: string;
  url_path_dir2?: string;
  url_path_dir3?: string;
}

/** Splits a URL into the fields that let a search filter or facet by site section. */
export const getUrlFields = (url: string): UrlFields => {
  const { hostname, pathname } = new URL(url);
  const [dir1, dir2, dir3] = getPathSegments(pathname);
  return {
    url_host: hostname,
    url_path: pathname,
    url_path_dir1: dir1,
    url_path_dir2: dir2,
    url_path_dir3: dir3,
  };
};

const SUPPORTED_FILE_EXTENSIONS: ReadonlySet<string> = new Set(WEB_CRAWL_FILE_EXTENSIONS);
const isSupportedFileExtension = (extension: string): extension is WebCrawlFileExtension =>
  SUPPORTED_FILE_EXTENSIONS.has(extension);

/** Lowercases and de-duplicates file extensions, or returns `null` when one cannot be crawled. */
export const normalizeFileExtensions = (
  extensions: string[] = []
): WebCrawlFileExtension[] | null => {
  const normalized = new Set<WebCrawlFileExtension>();
  for (const rawExtension of extensions) {
    const extension = rawExtension.trim().toLowerCase().replace(/^\./, '');
    if (!isSupportedFileExtension(extension)) {
      return null;
    }
    normalized.add(extension);
  }
  return [...normalized];
};

const hasSkippedExtension = (url: string, fileExtensions: readonly string[]): boolean => {
  const { pathname } = new URL(url);
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex === -1) {
    return false;
  }
  const extension = lastSegment.slice(dotIndex + 1).toLowerCase();
  return SKIPPED_EXTENSIONS.has(extension) && !fileExtensions.includes(extension);
};

const isWhitespace = (char: string): boolean =>
  char === ' ' || char === '\n' || char === '\t' || char === '\r';

const isLinkTargetEnd = (char: string, openParentheses: number): boolean =>
  isWhitespace(char) || (char === ')' && openParentheses === 0);

/**
 * Yields the raw target of every markdown link in a document.
 *
 * Scans with a forward-only cursor instead of a regular expression, so the cost stays linear in
 * the document length whatever the page contains. Balanced parentheses are part of the target, and
 * a target in angle brackets is everything between them.
 */
export function* iterateLinkTargets(markdown: string): Generator<string> {
  let cursor = 0;

  while (true) {
    const openIndex = markdown.indexOf(LINK_TARGET_OPEN, cursor);
    if (openIndex === -1) {
      return;
    }

    const isBracketed = markdown[openIndex + LINK_TARGET_OPEN.length] === '<';
    const targetStart = openIndex + LINK_TARGET_OPEN.length + (isBracketed ? 1 : 0);
    const scanLimit = Math.min(markdown.length, targetStart + MAX_URL_LENGTH);
    let targetEnd = targetStart;
    let openParentheses = 0;
    for (; targetEnd < scanLimit; targetEnd++) {
      const char = markdown[targetEnd];
      if (isBracketed ? char === '>' || char === '\n' : isLinkTargetEnd(char, openParentheses)) {
        break;
      }
      if (char === '(') {
        openParentheses++;
      } else if (char === ')') {
        openParentheses--;
      }
    }
    cursor = targetEnd;

    const isClosed = !isBracketed || markdown[targetEnd] === '>';
    if (isClosed && targetEnd !== scanLimit && targetEnd !== targetStart) {
      yield markdown.slice(targetStart, targetEnd);
    }
  }
}

/**
 * Whether a normalized URL is a page of the site, as opposed to another site or an asset. Files
 * with one of `fileExtensions` count as pages.
 */
export const isSameSitePage = (
  url: string,
  siteKey: string,
  fileExtensions: readonly string[] = []
): boolean => getSiteKey(url) === siteKey && !hasSkippedExtension(url, fileExtensions);

/** Collects the same-site page links of a markdown document. */
export const extractLinks = (
  markdown: string,
  pageUrl: string,
  fileExtensions: readonly string[] = []
): string[] => {
  const siteKey = getSiteKey(pageUrl);
  const links = new Set<string>();

  for (const target of iterateLinkTargets(markdown)) {
    if (links.size >= MAX_LINKS_PER_PAGE) {
      break;
    }
    const link = normalizeUrl(target, pageUrl);
    if (link && isSameSitePage(link, siteKey, fileExtensions)) {
      links.add(link);
    }
  }

  return [...links];
};
