/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerResponseBodyV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { CreateGapFillAutoSchedulerResult } from '../../../../../../../application/gap_auto_fill_scheduler/methods/create/types';

export const transformResponse = (
  result: CreateGapFillAutoSchedulerResult
): GapAutoFillSchedulerResponseBodyV1 => ({
  id: result.id,
  name: result.attributes.name,
  enabled: result.attributes.enabled,
  schedule: result.attributes.schedule,
  rules_filter: result.attributes.rulesFilter,
  gap_fill_range: result.attributes.gapFillRange,
  max_amount_of_gaps_to_process_per_run: result.attributes.maxAmountOfGapsToProcessPerRun,
  max_amount_of_rules_to_process_per_run: result.attributes.maxAmountOfRulesToProcessPerRun,
  amount_of_retries: result.attributes.amountOfRetries,
  created_by: result.attributes.createdBy,
  updated_by: result.attributes.updatedBy,
  created_at: result.attributes.createdAt,
  updated_at: result.attributes.updatedAt,
  last_run: result.attributes.lastRun,
  scheduled_task_id: result.attributes.scheduledTaskId,
});
