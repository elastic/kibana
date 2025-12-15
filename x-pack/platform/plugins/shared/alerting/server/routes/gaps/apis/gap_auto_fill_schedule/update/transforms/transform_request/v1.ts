/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  GetGapAutoFillSchedulerParamsV1,
  UpdateGapAutoFillSchedulerRequestBodyV1,
} from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { UpdateGapAutoFillSchedulerParams } from '../../../../../../../application/gap_auto_fill_scheduler/methods/update/types';

export const transformRequest = (
  request: KibanaRequest<
    GetGapAutoFillSchedulerParamsV1,
    unknown,
    UpdateGapAutoFillSchedulerRequestBodyV1,
    'put'
  >
): UpdateGapAutoFillSchedulerParams => {
  const body = request.body;
  const params = request.params;

  return {
    id: params.id,
    request,
    name: body.name,
    enabled: body.enabled,
    gapFillRange: body.gap_fill_range,
    maxBackfills: body.max_backfills,
    numRetries: body.num_retries,
    schedule: body.schedule,
    scope: body.scope,
    ruleTypes: body.rule_types.map((ruleType) => ({
      type: ruleType.type,
      consumer: ruleType.consumer,
    })),
  };
};
