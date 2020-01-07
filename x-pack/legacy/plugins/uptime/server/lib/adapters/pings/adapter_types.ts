/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocCount, Ping, PingResults } from '../../../../common/graphql/types';
import { HistogramResult } from '../../../../common/domain_types';
import { UMElasticsearchQueryFn } from '../framework';

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

export interface GetPingHistogramParams {
  /** @member dateRangeStart timestamp bounds */
  dateRangeStart: string;
  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;
  /** @member filters user-defined filters */
  filters?: string | null;
  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
  /** @member statusFilter special filter targeting the latest status of each monitor */
  statusFilter?: string | null;
}

/**
 * Count the number of documents in heartbeat indices
 */
export interface UMPingsAdapter {
  getAll: UMElasticsearchQueryFn<GetAllParams, PingResults>;

  getMonitor: UMElasticsearchQueryFn<GetLatestMonitorDocsParams, Ping>;

  getLatestMonitorStatus: UMElasticsearchQueryFn<GetLatestMonitorDocsParams, Ping>;

  getPingHistogram: UMElasticsearchQueryFn<GetPingHistogramParams, HistogramResult>;

  /**
   * Gets data used for a composite histogram for the currently-running monitors.
   */
  getDocCount: UMElasticsearchQueryFn<{}, DocCount>;
}

export interface HistogramQueryResult {
  key: number;
  doc_count: number;
  bucket_total: {
    value: number;
  };
  down: {
    bucket_count: {
      value: number;
    };
  };
}
