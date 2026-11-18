/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NewIndexDetails {
  indexName: string;
  documentsCount: number;
  sizeInBytes: number | null;
  createdAt: number;
}

/** Which parts of the data panel the caller's index privileges allow, as Elasticsearch reported. */
export interface DataPanelAccess {
  showPanel: boolean;
  showDocuments: boolean;
  showTotalSize: boolean;
}

export interface DeploymentStatsResponse {
  dataPanelAccess: DataPanelAccess;
  indicesCount: number | null;
  dataStreamsCount: number | null;
  vectorCount: number | null;
  storeSizeBytes: number | null;
  dashboardsCount: number | null;
  documentsCount: number | null;
  apiKeysCount: number | null;
  expiringApiKeysCount: number | null;
  newIndex: NewIndexDetails | null;
}

export interface StarredDashboardsCountResponse {
  count: number | null;
}

export type WebCrawlStatus = 'running' | 'completed' | 'failed' | 'canceled';

export interface WebCrawlStartRequest {
  url: string;
  /** How many links away from `url` the crawl may go. Defaults to 2. */
  maxDepth?: number;
  /** How many pages the crawl may request and index. Defaults to 500. */
  maxDocuments?: number;
}

export interface WebCrawl {
  id: string;
  indexName: string;
  url: string;
  status: WebCrawlStatus;
  maxDepth: number;
  maxDocuments: number;
  documentsCount: number;
  /** Pages that could not be extracted or indexed. */
  failedCount: number;
  /** Pages requested so far, whether or not they came back. */
  requestedCount: number;
  /** Pages found and still waiting to be requested. */
  queuedCount: number;
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
