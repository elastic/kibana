/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type WebCrawlStatus = 'running' | 'completed' | 'failed' | 'canceled';

export interface WebCrawlStartRequest {
  url: string;
  /** How many links away from `url` the crawl may go. Defaults to 2. */
  maxDepth?: number;
  /** How many pages the crawl may request and index. Defaults to 500. */
  maxDocuments?: number;
  /** Path prefixes, such as `/docs`. When given, only pages under one of them are crawled. */
  includePaths?: string[];
  /** Path prefixes whose pages are not crawled. They win over `includePaths`. */
  excludePaths?: string[];
  /** The index to crawl into. Defaults to `web-crawl-<host of url>`. */
  indexName?: string;
  /** More pages to start from besides `url`, on the same site or on other sites. */
  seedUrls?: string[];
  /** Sitemaps to read besides the ones the sites declare. */
  sitemapUrls?: string[];
}

export interface WebCrawl {
  id: string;
  indexName: string;
  url: string;
  status: WebCrawlStatus;
  maxDepth: number;
  maxDocuments: number;
  includePaths: string[];
  excludePaths: string[];
  /** The pages the crawl started from besides `url`. */
  seedUrls: string[];
  sitemapUrls: string[];
  documentsCount: number;
  /** Pages that could not be extracted or indexed. */
  failedCount: number;
  /** Pages requested so far, whether or not they came back. */
  requestedCount: number;
  /** Pages found and still waiting to be requested. */
  queuedCount: number;
  /** Links the crawl did not follow because the site's robots.txt disallows them. */
  skippedByRobotsCount: number;
  /** Links the crawl did not follow because of `includePaths` and `excludePaths`. */
  skippedByRulesCount: number;
  /** Pages removed from the index because this crawl no longer found them. */
  purgedCount: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  /** A stop was requested and the crawl has not wound down yet. */
  isStopping: boolean;
  startedBy?: string;
  /** The workflow that started the crawl, when one did. */
  workflowId?: string;
}

export interface WebCrawlListResponse {
  crawls: WebCrawl[];
}

/** Hours or days: the units a scheduled workflow trigger accepts that suit a crawl. */
export type WebCrawlScheduleUnit = 'h' | 'd';

export interface WebCrawlScheduleRequest extends WebCrawlStartRequest {
  /** The crawl repeats every `every` `unit`s. */
  every: number;
  unit: WebCrawlScheduleUnit;
}

/** A workflow that crawls on a schedule. */
export interface WebCrawlSchedule {
  workflowId: string;
  name: string;
  enabled: boolean;
}
