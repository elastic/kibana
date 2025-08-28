/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { UpdateGapFillAutoSchedulerParams } from './types';
import type { GapFillAutoSchedulerResponse } from '../../result/types';
import { updateGapFillAutoSchedulerSchema } from './schemas';
import type { GapAutoFillSchedulerSavedObjectAttributes } from '../../transforms';
import {
  transformGapAutoFillSchedulerUpdateParams,
  transformSavedObjectToGapAutoFillSchedulerResult,
} from '../../transforms';

export async function updateGapFillAutoScheduler(
  context: RulesClientContext,
  params: { id: string; updates: UpdateGapFillAutoSchedulerParams }
): Promise<GapFillAutoSchedulerResponse> {
  // Validate input parameters
  updateGapFillAutoSchedulerSchema.validate(params.updates);

  const soClient = context.unsecuredSavedObjectsClient;
  const taskManager = context.taskManager;
  const { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } = await import('../../../../saved_objects');

  const so = await soClient.get(GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE, params.id);
  const scheduledTaskId: string | undefined = (so.attributes as Record<string, unknown>)
    .scheduledTaskId as string | undefined;

  // Transform update parameters to saved object attributes
  const updatedAttrs = transformGapAutoFillSchedulerUpdateParams(params.updates);

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

  // Transform the saved object to the result format
  return transformSavedObjectToGapAutoFillSchedulerResult({
    savedObject: updatedSo as SavedObject<GapAutoFillSchedulerSavedObjectAttributes>,
  });
}
