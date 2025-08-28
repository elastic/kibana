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
  rules_filter: result.rulesFilter,
  gap_fill_range: result.gapFillRange,
  max_amount_of_gaps_to_process_per_run: result.maxAmountOfGapsToProcessPerRun,
  max_amount_of_rules_to_process_per_run: result.maxAmountOfRulesToProcessPerRun,
  amount_of_retries: result.amountOfRetries,
  created_by: result.createdBy,
  updated_by: result.updatedBy,
  created_at: result.createdAt,
  updated_at: result.updatedAt,
  last_run: result.lastRun,
  scheduled_task_id: result.scheduledTaskId,
});
