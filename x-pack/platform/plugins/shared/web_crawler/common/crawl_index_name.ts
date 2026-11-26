/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEB_CRAWL_MAX_INDEX_NAME_LENGTH } from './constants';

const INDEX_NAME_PREFIX = 'web-crawl-';

/**
 * Suggests the index to crawl a site into, named after its host with the `www.` host as the bare
 * host. A crawl can be given any other name, and has to be when the host makes this one too long.
 */
export const getCrawlIndexName = (url: string): string =>
  `${INDEX_NAME_PREFIX}${new URL(url).hostname
    .replace(/^www\./, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')}`;

/** Whether a crawl may be pointed at an index of this name. Stricter than Elasticsearch, on purpose. */
export const isValidCrawlIndexName = (indexName: string): boolean =>
  indexName.length <= WEB_CRAWL_MAX_INDEX_NAME_LENGTH && /^[a-z0-9][a-z0-9._-]*$/.test(indexName);
