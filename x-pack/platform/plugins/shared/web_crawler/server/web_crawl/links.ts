/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_URL_LENGTH = 2048;
// Deeper paths and longer queries are mostly calendars, faceted listings and other URL traps.
const MAX_URL_SEGMENTS = 16;
const MAX_URL_PARAMS = 10;
const PATH_DIRECTORY_FIELDS = 3;
const MAX_LINKS_PER_PAGE = 2000;
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
  const [dir1, dir2, dir3] = getPathSegments(pathname).slice(0, PATH_DIRECTORY_FIELDS);
  return {
    url_host: hostname,
    url_path: pathname,
    url_path_dir1: dir1,
    url_path_dir2: dir2,
    url_path_dir3: dir3,
  };
};

const hasSkippedExtension = (url: string): boolean => {
  const { pathname } = new URL(url);
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  return dotIndex !== -1 && SKIPPED_EXTENSIONS.has(lastSegment.slice(dotIndex + 1).toLowerCase());
};

const isLinkTargetEnd = (char: string): boolean =>
  char === ')' || char === ' ' || char === '\n' || char === '\t' || char === '\r';

/**
 * Yields the raw target of every markdown link in a document.
 *
 * Scans with a forward-only cursor instead of a regular expression, so the cost stays linear in
 * the document length whatever the page contains.
 */
export function* iterateLinkTargets(markdown: string): Generator<string> {
  let cursor = 0;

  while (true) {
    const openIndex = markdown.indexOf(LINK_TARGET_OPEN, cursor);
    if (openIndex === -1) {
      return;
    }

    const targetStart = openIndex + LINK_TARGET_OPEN.length;
    const scanLimit = Math.min(markdown.length, targetStart + MAX_URL_LENGTH);
    let targetEnd = targetStart;
    while (targetEnd < scanLimit && !isLinkTargetEnd(markdown[targetEnd])) {
      targetEnd++;
    }
    cursor = targetEnd;

    if (targetEnd !== scanLimit && targetEnd !== targetStart) {
      yield markdown.slice(targetStart, targetEnd);
    }
  }
}

/** Whether a normalized URL is a page of the site, as opposed to another site or a binary asset. */
export const isSameSitePage = (url: string, siteKey: string): boolean =>
  getSiteKey(url) === siteKey && !hasSkippedExtension(url);

/** Collects the same-site page links of a markdown document. */
export const extractLinks = (markdown: string, pageUrl: string): string[] => {
  const siteKey = getSiteKey(pageUrl);
  const links = new Set<string>();

  for (const target of iterateLinkTargets(markdown)) {
    if (links.size >= MAX_LINKS_PER_PAGE) {
      break;
    }
    const link = normalizeUrl(target, pageUrl);
    if (link && isSameSitePage(link, siteKey)) {
      links.add(link);
    }
  }

  return [...links];
};
