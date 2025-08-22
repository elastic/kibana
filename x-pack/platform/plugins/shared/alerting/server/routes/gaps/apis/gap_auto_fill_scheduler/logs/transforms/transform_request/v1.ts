/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import type { GapAutoFillSchedulerLogsQueryV1 } from '../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler_logs';

export interface LogsRequestParams {
  start?: string;
  end?: string;
  page: number;
  perPage: number;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  filter?: string;
}

export const transformRequest = (query: GapAutoFillSchedulerLogsQueryV1): LogsRequestParams => ({
  start: query.start,
  end: query.end,
  page: query.page || 1,
  perPage: query.per_page || 50,
  sort: query.sort,
  filter: query.filter,
});
