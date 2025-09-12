/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client/types';
import type { GetGapFillAutoSchedulerParams, GapFillAutoSchedulerResponse } from '../../../gap_auto_fill_scheduler/methods/get';
import { getGapFillAutoSchedulerSchema } from './schemas';

export async function getGapFillAutoScheduler(
  context: RulesClientContext,
  params: GetGapFillAutoSchedulerParams
): Promise<GapFillAutoSchedulerResponse> {
  // Validate input parameters
  getGapFillAutoSchedulerSchema.validate(params);

  const { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } = await import('../../../../saved_objects');
  const savedObject = await context.unsecuredSavedObjectsClient.get(
    GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
    params.id
  );

  // Transform SavedObject to response format
  const attributes = savedObject.attributes as Record<string, unknown>;
  return {
    id: savedObject.id,
    name: attributes.name as string,
    enabled: attributes.enabled as boolean,
    schedule: attributes.schedule as { interval: string },
    rulesFilter: attributes.rulesFilter as string,
    gapFillRange: attributes.gapFillRange as string,
    maxAmountOfGapsToProcessPerRun: attributes.maxAmountOfGapsToProcessPerRun as number,
    maxAmountOfRulesToProcessPerRun: attributes.maxAmountOfRulesToProcessPerRun as number,
    amountOfRetries: attributes.amountOfRetries as number,
    createdBy: attributes.createdBy as string | undefined,
    updatedBy: attributes.updatedBy as string | undefined,
    createdAt: attributes.createdAt as string,
    updatedAt: attributes.updatedAt as string,
    lastRun: attributes.lastRun as string | null | undefined,
    scheduledTaskId: attributes.scheduledTaskId as string,
  };
}
