/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerLogsQueryV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler_logs';
import type { GetGapFillAutoSchedulerLogsParams } from '../../../../../../../application/gap_auto_fill_scheduler/methods/get_logs/types';

export const transformRequest = (
  query: GapAutoFillSchedulerLogsQueryV1
): Omit<GetGapFillAutoSchedulerLogsParams, 'id'> => ({
  start: query.start,
  end: query.end,
  page: query.page || 1,
  perPage: query.per_page || 50,
  sort: query.sort,
  filter: query.filter,
});
