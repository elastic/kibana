/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WEB_CRAWL_MAX_INDEX_NAME_LENGTH,
  WEB_CRAWL_MAX_PATH_RULES,
  WEB_CRAWL_MAX_PATH_RULE_LENGTH,
  WEB_CRAWL_MAX_URL_LENGTH,
} from '../common/constants';

export const isIntegerInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

export const isCrawlableUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/** Reads path prefixes typed as a list separated by commas or whitespace. */
export const parsePathPrefixes = (text: string): string[] => [
  ...new Set(text.split(/[\s,]+/).filter((path) => path !== '')),
];

export const arePathPrefixesValid = (paths: string[]): boolean =>
  paths.length <= WEB_CRAWL_MAX_PATH_RULES &&
  paths.every((path) => path.startsWith('/') && path.length <= WEB_CRAWL_MAX_PATH_RULE_LENGTH);

/**
 * Reads URLs typed as a list separated by whitespace, or by commas in front of the next URL. A
 * comma elsewhere is left alone, as URLs can contain them.
 */
export const parseUrlList = (text: string): string[] => [
  ...new Set(
    text
      .split(/\s+|,(?=https?:\/\/)/i)
      .map((url) => url.replace(/^,+|,+$/g, ''))
      .filter((url) => url !== '')
  ),
];

// A comma in the host is a list that was not split, not a host.
const isListedUrlValid = (url: string): boolean =>
  url.length <= WEB_CRAWL_MAX_URL_LENGTH &&
  isCrawlableUrl(url) &&
  !new URL(url).hostname.includes(',');

export const areUrlsValid = (urls: string[], maxCount: number): boolean =>
  urls.length <= maxCount && urls.every(isListedUrlValid);

/** Mirrors what the server accepts as the name of an index to crawl into. */
export const isValidIndexName = (indexName: string): boolean =>
  indexName.length <= WEB_CRAWL_MAX_INDEX_NAME_LENGTH && /^[a-z0-9][a-z0-9._-]*$/.test(indexName);
