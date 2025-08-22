/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { UpdateGapFillAutoSchedulerParams } from './types';
import { updateGapFillAutoSchedulerSchema } from './schemas';

export async function updateGapFillAutoScheduler(
  context: RulesClientContext,
  params: { id: string; updates: UpdateGapFillAutoSchedulerParams }
): Promise<SavedObject<Record<string, unknown>> | SavedObjectsUpdateResponse<Record<string, unknown>>> {
  // Validate input parameters
  updateGapFillAutoSchedulerSchema.validate(params.updates);

  const soClient = context.unsecuredSavedObjectsClient;
  const taskManager = context.taskManager;
  const { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } = await import('../../../../saved_objects');

  const so = await soClient.get(GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE, params.id);
  const scheduledTaskId: string | undefined = (so.attributes as Record<string, unknown>)
    .scheduledTaskId as string | undefined;

  const {
    schedule,
    name,
    maxAmountOfGapsToProcessPerRun,
    maxAmountOfRulesToProcessPerRun,
    amountOfRetries,
    rulesFilter,
    gapFillRange,
    enabled,
  } = params.updates;

  const updatedAttrs: Record<string, unknown> = {
    ...(name !== undefined && { name }),
    ...(maxAmountOfGapsToProcessPerRun !== undefined && { maxAmountOfGapsToProcessPerRun }),
    ...(maxAmountOfRulesToProcessPerRun !== undefined && { maxAmountOfRulesToProcessPerRun }),
    ...(amountOfRetries !== undefined && { amountOfRetries }),
    ...(rulesFilter !== undefined && { rulesFilter }),
    ...(gapFillRange !== undefined && { gapFillRange }),
    ...(schedule !== undefined && { schedule }),
    ...(enabled !== undefined && { enabled }),
    updatedAt: new Date().toISOString(),
  };

  const updatedSo = Object.keys(updatedAttrs).length
    ? await soClient.update(GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE, params.id, updatedAttrs)
    : so;

  if (scheduledTaskId) {
    if (enabled !== undefined) {
      if (enabled) await taskManager.bulkEnable([scheduledTaskId]);
      else await taskManager.bulkDisable([scheduledTaskId]);
    }
    if (schedule) {
      await taskManager.bulkUpdateSchedules([scheduledTaskId], schedule);
    }
  }

  return updatedSo;
}
