/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocCount, Ping, PingResults } from '../../../../common/graphql/types';
import { HistogramResult } from '../../../../common/domain_types';

export interface UMPingsAdapter {
  getAll(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null,
    status?: string | null,
    sort?: string | null,
    size?: number | null,
    location?: string | null
  ): Promise<PingResults>;

  getLatestMonitorStatus(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null,
    location?: string | null
  ): Promise<Ping>;

  getPingHistogram(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null,
    monitorId?: string | null,
    statusFilter?: string | null
  ): Promise<HistogramResult>;

  getDocCount(request: any): Promise<DocCount>;
}
