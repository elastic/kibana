/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ping, PingResults } from '../../../common/graphql/types';
import { UMElasticsearchQueryFn } from '../adapters';
import { GetPingHistogramParams, HistogramResult } from '../../../common/types';

export interface GetAllParams {
  /** @member dateRangeStart timestamp bounds */
  dateRangeStart: string;

  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;

  /** @member monitorId optional limit by monitorId */
  monitorId?: string | null;

  /** @member status optional limit by check statuses */
  status?: string | null;

  /** @member sort optional sort by timestamp */
  sort?: string | null;

  /** @member size optional limit query size */
  size?: number | null;

  /** @member location optional location value for use in filtering*/
  location?: string | null;
}

export interface GetLatestMonitorDocsParams {
  /** @member dateRangeStart timestamp bounds */
  dateStart?: string;

  /** @member dateRangeEnd timestamp bounds */
  dateEnd?: string;

  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
}

/**
 * Count the number of documents in heartbeat indices
 */
export interface UMPingsAdapter {
  getAll: UMElasticsearchQueryFn<GetAllParams, PingResults>;

  // Get the monitor meta info regardless of timestamp
  getMonitor: UMElasticsearchQueryFn<GetLatestMonitorDocsParams, Ping>;

  getLatestMonitorStatus: UMElasticsearchQueryFn<GetLatestMonitorDocsParams, Ping>;

  getPingHistogram: UMElasticsearchQueryFn<GetPingHistogramParams, HistogramResult>;
}

export interface HistogramQueryResult {
  key: number;
  key_as_string: string;
  doc_count: number;
  down: {
    doc_count: number;
  };
  up: {
    doc_count: number;
  };
}
