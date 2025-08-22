/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client/types';
import type { CreateGapFillAutoSchedulerParams, CreateGapFillAutoSchedulerResult } from './types';
import { createGapFillAutoSchedulerSchema } from './schemas';

export async function createGapFillAutoScheduler(
  context: RulesClientContext,
  params: CreateGapFillAutoSchedulerParams
): Promise<CreateGapFillAutoSchedulerResult> {
  // Validate input parameters
  createGapFillAutoSchedulerSchema.validate(params);

  const soClient = context.unsecuredSavedObjectsClient;
  const taskManager = context.taskManager;
  const {
    name,
    maxAmountOfGapsToProcessPerRun,
    maxAmountOfRulesToProcessPerRun,
    amountOfRetries,
    rulesFilter,
    gapFillRange,
    schedule,
  } = params;

  const autoFill = {
    schedule: schedule || { interval: '1h' },
    name: name || 'gap-fill-auto-fill-name',
  };

  const nowIso = new Date().toISOString();
  const createdBy = (await context.getUserName?.()) ?? null;

  const { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } = await import('../../../../saved_objects');

  const so = await soClient.create(
    GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
    {
      name: autoFill.name,
      enabled: true,
      schedule: autoFill.schedule,
      rulesFilter: rulesFilter || '',
      gapFillRange: gapFillRange || 'now-7d',
      maxAmountOfGapsToProcessPerRun: maxAmountOfGapsToProcessPerRun || 10000,
      maxAmountOfRulesToProcessPerRun: maxAmountOfRulesToProcessPerRun || 100,
      amountOfRetries: amountOfRetries || 3,
      createdBy: createdBy ?? undefined,
      updatedBy: createdBy ?? undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastRun: undefined,
    },
    { id: 'default' }
  );

  const task = await taskManager.ensureScheduled(
    {
      id: so.id,
      taskType: 'gap-fill-auto-scheduler-task',
      schedule: autoFill.schedule,
      scope: ['securitySolution'],
      params: {
        configId: so.id,
        spaceId: context.spaceId,
      },
      state: {},
    },
    {
      request: params.request,
    }
  );

  await soClient.update(GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE, so.id, {
    scheduledTaskId: task.id,
    updatedAt: new Date().toISOString(),
  });

  return {
    id: so.id,
    attributes: {
      ...so.attributes,
      scheduledTaskId: task.id,
    },
  };
}
