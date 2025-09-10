/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerLogsResponseBodyV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler_logs';
import type { GapFillAutoSchedulerLogsResult } from '../../../../../../../application/gap_auto_fill_scheduler/methods/get_logs/types';

export const transformResponse = (
  result: GapFillAutoSchedulerLogsResult
): GapAutoFillSchedulerLogsResponseBodyV1 => ({
  data: result.data,
  total: result.total,
  page: result.page,
  per_page: result.perPage,
});
