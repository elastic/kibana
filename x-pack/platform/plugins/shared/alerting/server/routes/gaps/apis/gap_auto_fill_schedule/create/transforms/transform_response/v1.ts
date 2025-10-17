/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerResponseBodyV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { GapFillAutoSchedulerResponse } from '../../../../../../../application/gap_auto_fill_scheduler/result/types';

export const transformResponse = (
  result: GapFillAutoSchedulerResponse
): GapAutoFillSchedulerResponseBodyV1 => ({
  id: result.id,
  name: result.name,
  enabled: result.enabled,
  schedule: result.schedule,
  gap_fill_range: result.gapFillRange,
  max_backfills: result.maxBackfills,
  amount_of_retries: result.amountOfRetries,
  created_by: result.createdBy,
  updated_by: result.updatedBy,
  created_at: result.createdAt,
  updated_at: result.updatedAt,
  scheduled_task_id: result.scheduledTaskId,
});
