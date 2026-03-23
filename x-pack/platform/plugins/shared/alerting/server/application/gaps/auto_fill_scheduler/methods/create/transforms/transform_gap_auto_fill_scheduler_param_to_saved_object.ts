/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateGapAutoFillSchedulerParams } from '../types';
import type { RawGapAutoFillSchedulerAttributesV1 } from '../../../../../../saved_objects/schemas/raw_gap_auto_fill_scheduler';

export const transformGapAutoFillSchedulerCreateParamToSavedObject = (
  params: CreateGapAutoFillSchedulerParams,
  {
    createdBy,
    createdAt,
    updatedAt,
    updatedBy,
  }: {
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    updatedBy: string | null;
  }
): RawGapAutoFillSchedulerAttributesV1 => {
  return {
    name: params.name,
    enabled: params.enabled,
    schedule: params.schedule,
    gapFillRange: params.gapFillRange,
    maxBackfills: params.maxBackfills,
    numRetries: params.numRetries,
    scope: params.scope,
    ruleTypes: params.ruleTypes,
    ruleTypeConsumerPairs: Array.from(
      new Set(params.ruleTypes.map((rt) => `${rt.type}:${rt.consumer}`))
    ),
    createdBy: createdBy ?? null,
    createdAt,
    updatedAt,
    updatedBy: updatedBy ?? null,
  };
};
