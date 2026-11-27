/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'webCrawler';
export const WEB_CRAWLER_ENABLED_FLAG = 'webCrawler.enabled';
export const MANAGEMENT_APP_ID = 'web_crawls';

export const WEB_CRAWLS_PATH = '/internal/web_crawler/crawls';
export const WEB_CRAWL_PATH = '/internal/web_crawler/crawls/{id}';
export const WEB_CRAWL_CANCEL_PATH = '/internal/web_crawler/crawls/{id}/_cancel';
export const WEB_CRAWLS_LIST_SIZE = 200;
export const WEB_CRAWL_DEFAULT_MAX_DEPTH = 2;
export const WEB_CRAWL_DEFAULT_MAX_DOCUMENTS = 500;
export const WEB_CRAWL_MAX_DEPTH_LIMIT = 5;
export const WEB_CRAWL_MAX_DOCUMENTS_LIMIT = 1000;
export const WEB_CRAWL_MAX_PATH_RULES = 20;
export const WEB_CRAWL_MAX_PATH_RULE_LENGTH = 256;
export const WEB_CRAWL_MAX_SEED_URLS = 20;
export const WEB_CRAWL_MAX_SITEMAP_URLS = 20;
export const WEB_CRAWL_MAX_URL_LENGTH = 2048;
export const WEB_CRAWL_MAX_INDEX_NAME_LENGTH = 255;
export const WEB_CRAWL_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'csv',
  'json',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
] as const;
export type WebCrawlFileExtension = (typeof WEB_CRAWL_FILE_EXTENSIONS)[number];
