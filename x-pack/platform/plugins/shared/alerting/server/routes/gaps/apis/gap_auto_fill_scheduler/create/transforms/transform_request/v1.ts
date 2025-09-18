/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { GapAutoFillSchedulerRequestBodyV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { CreateGapFillAutoSchedulerParams } from '../../../../../../../application/gap_auto_fill_scheduler/methods/create/types';

export const transformRequest = (
  request: KibanaRequest<unknown, unknown, unknown, 'post'>
): CreateGapFillAutoSchedulerParams => {
  const body = request.body as GapAutoFillSchedulerRequestBodyV1;
  return {
    id: body.id,
    name: body.name,
    enabled: body.enabled,
    maxAmountOfGapsToProcessPerRun: body.max_amount_of_gaps_to_process_per_run,
    maxAmountOfRulesToProcessPerRun: body.max_amount_of_rules_to_process_per_run,
    amountOfRetries: body.amount_of_retries,
    rulesFilter: body.rules_filter,
    gapFillRange: body.gap_fill_range,
    schedule: body.schedule,
    scope: body.scope,
    ruleTypes: body.rule_types.map((ruleType) => ({
      type: ruleType.type,
      consumer: ruleType.consumer,
    })),
    request,
  };
};
