/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../../task';
import { TaskStatus } from '../../task';
import type { TaskTypeDictionary } from '../../task_type_dictionary';
import { getRetryAt } from '../../lib/get_retry_at';

export interface BuildClaimUpdateOpts {
  taskId: string;
  version: string;
  taskType: string;
  attempts: number;
  retryAt: Date | string | null;
  runAt: Date | string;
  schedule: ConcreteTaskInstance['schedule'] | null;
  timeoutOverride: string | undefined;
  ownerId: string;
  definitions: TaskTypeDictionary;
}

export function buildClaimUpdate({
  taskId,
  version,
  taskType,
  attempts,
  retryAt,
  runAt,
  schedule,
  timeoutOverride,
  ownerId,
  definitions,
}: BuildClaimUpdateOpts): PartialConcreteTaskInstance {
  const now = new Date();
  const retryAtDate = retryAt ? new Date(retryAt) : null;
  const runAtDate = new Date(runAt);

  return {
    id: taskId,
    version,
    scheduledAt:
      retryAtDate != null && retryAtDate.getTime() < Date.now() ? retryAtDate : runAtDate,
    status: TaskStatus.Running,
    startedAt: now,
    attempts: attempts + 1,
    retryAt:
      getRetryAt(
        {
          attempts,
          schedule,
          timeoutOverride,
        } as unknown as ConcreteTaskInstance,
        definitions.get(taskType)
      ) ?? null,
    ownerId,
  };
}
