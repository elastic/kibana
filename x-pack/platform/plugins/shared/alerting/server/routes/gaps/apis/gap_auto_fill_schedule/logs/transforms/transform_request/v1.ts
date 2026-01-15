/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerLogsRequestQueryV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { FindGapAutoFillSchedulerLogsParams } from '../../../../../../../application/gaps/auto_fill_scheduler/methods/find_logs/types/find_gap_auto_fill_scheduler_logs_types';

export const transformRequest = (
  id: string,
  query: GapAutoFillSchedulerLogsRequestQueryV1
): FindGapAutoFillSchedulerLogsParams => ({
  id,
  start: query.start,
  end: query.end,
  page: query.page,
  perPage: query.per_page,
  sortField: query.sort_field,
  sortDirection: query.sort_direction,
  statuses: query.statuses,
});
