/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { UpdateGapFillAutoSchedulerParams } from '../../../../../../../application/gap_auto_fill_scheduler/methods/update/types';
import type { UpdateGapAutoFillSchedulerRequestBodyV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';

export const transformRequest = (
  request: KibanaRequest<{ id: string }, unknown, unknown, 'put'>
): { id: string; updates: UpdateGapFillAutoSchedulerParams } => {
  const { id } = request.params;
  const body = request.body as UpdateGapAutoFillSchedulerRequestBodyV1;

  return {
    id,
    updates: {
      schedule: body.schedule,
      name: body.name,
      maxAmountOfGapsToProcessPerRun: body.max_amount_of_gaps_to_process_per_run,
      maxAmountOfRulesToProcessPerRun: body.max_amount_of_rules_to_process_per_run,
      amountOfRetries: body.amount_of_retries,
      rulesFilter: body.rules_filter,
      gapFillRange: body.gap_fill_range,
      enabled: body.enabled,
    },
  };
};
