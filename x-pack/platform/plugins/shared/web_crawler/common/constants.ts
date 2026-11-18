/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'webCrawler';

export const WEB_CRAWLS_PATH = '/internal/web_crawler/crawls';
export const WEB_CRAWL_PATH = '/internal/web_crawler/crawls/{id}';
export const WEB_CRAWL_CANCEL_PATH = '/internal/web_crawler/crawls/{id}/_cancel';
/** The most recent crawls the management page lists. */
export const WEB_CRAWLS_LIST_SIZE = 200;
/** The seed page is depth 0, so by default pages up to two links away from it are crawled. */
export const WEB_CRAWL_DEFAULT_MAX_DEPTH = 2;
export const WEB_CRAWL_DEFAULT_MAX_DOCUMENTS = 500;
/** Upper bounds on what a single crawl may ask for. */
export const WEB_CRAWL_MAX_DEPTH_LIMIT = 5;
export const WEB_CRAWL_MAX_DOCUMENTS_LIMIT = 1000;
