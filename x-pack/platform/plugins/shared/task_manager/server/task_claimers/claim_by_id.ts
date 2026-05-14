/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ClaimNudgeTarget } from '../claim_nudge';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../task';
import type { TaskStore } from '../task_store';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import { buildClaimUpdate } from './lib/build_claim_update';
import { executeClaimUpdates } from './lib/execute_claim_updates';

export interface ClaimByIdResult {
  docs: ConcreteTaskInstance[];
  conflicts: number;
  errors: number;
}

interface ClaimTasksByIdOpts {
  taskTargets: ClaimNudgeTarget[];
  taskStore: TaskStore;
  definitions: TaskTypeDictionary;
  logger: Logger;
}

export async function claimTasksById({
  taskTargets,
  taskStore,
  definitions,
  logger,
}: ClaimTasksByIdOpts): Promise<ClaimByIdResult> {
  const uniqueTargets = [...new Map(taskTargets.map((target) => [target.taskId, target])).values()];
  const updates: PartialConcreteTaskInstance[] = [];

  for (const target of uniqueTargets) {
    const taskDefinition = definitions.get(target.taskType);
    if (!taskDefinition) {
      logger.info(
        `[claim_nudge] claim_by_id skipped task_id=${target.taskId} task_type=${target.taskType} reason=unknown_task_type`
      );
      continue;
    }

    updates.push(
      buildClaimUpdate({
        taskId: target.taskId,
        version: target.version,
        taskType: target.taskType,
        attempts: 0,
        retryAt: null,
        runAt: new Date(),
        schedule: null,
        timeoutOverride: undefined,
        ownerId: taskStore.taskManagerId,
        definitions,
      })
    );
  }

  const { docs, conflicts, updateErrors, getErrors } = await executeClaimUpdates({
    taskStore,
    updates,
    logger,
    logPrefix: '[claim_nudge] claim_by_id',
  });

  return {
    docs,
    conflicts,
    errors: updateErrors + getErrors,
  };
}
