/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEB_CRAWL_MAX_INDEX_NAME_LENGTH } from './constants';

const INDEX_NAME_PREFIX = 'web-crawl-';

/**
 * Suggests the index to crawl a site into, named after its host without `www.`. The name is not
 * valid when the host is too long.
 */
export const getCrawlIndexName = (url: string): string =>
  `${INDEX_NAME_PREFIX}${new URL(url).hostname
    .replace(/^www\./, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')}`;

/** The Elasticsearch rules for an index name, plus no leading dot, which marks a hidden index. */
export const isValidCrawlIndexName = (indexName: string): boolean =>
  indexName !== '' &&
  indexName === indexName.toLowerCase() &&
  !/[\\/*?"<>| ,#:]/.test(indexName) &&
  !/^[-_+.]/.test(indexName) &&
  new TextEncoder().encode(indexName).length <= WEB_CRAWL_MAX_INDEX_NAME_LENGTH;
