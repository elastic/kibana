/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * "Task Manager store, bundled": writes a real `task` saved object directly through a bundled
 * `SavedObjectsRepository` scoped to `.kibana_task_manager`, using the plugin's own real
 * `setupSavedObjects` registration (mappings + model versions, unmodified) so the document is
 * schema-correct. Per the ground rules this pod must not touch Task Manager's polling or claiming
 * code, so instead of importing `task_store.ts` (which pulls in the full `TaskStore` class and its
 * metrics/event-emitter surface) the attribute-serialization shape below is a small, direct port of
 * `taskInstanceToAttributes` from that file — real behavior, minimal surface.
 */
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { setupSavedObjects, TASK_SO_NAME } from '../../../../task_manager/server/saved_objects';
import { TASK_MANAGER_INDEX } from '../../../../task_manager/server/constants';
import { TaskStatus } from '../../../../task_manager/server/task';
import { FakeSavedObjectsServiceSetup } from './fake_core';
import { buildSavedObjectsRepository } from './so_repository';

export interface ScheduledTaskInstance {
  readonly id: string;
  readonly taskType: string;
  readonly params: Record<string, unknown>;
  readonly state?: Record<string, unknown>;
  readonly scope?: string[];
  readonly spaceId?: string;
}

export interface TaskManagerStore {
  schedule(task: ScheduledTaskInstance): Promise<{ id: string }>;
}

/** Real mappings/model versions, bundled store scoped to `.kibana_task_manager`. */
export const buildTaskManagerStore = ({
  client,
  logger,
}: {
  client: Client;
  logger: Logger;
}): TaskManagerStore => {
  const tmSoSetup = new FakeSavedObjectsServiceSetup();
  setupSavedObjects(tmSoSetup as never);

  const repository = buildSavedObjectsRepository({
    client,
    indexName: TASK_MANAGER_INDEX,
    soTypes: [...tmSoSetup.types.values()],
    logger: logger as never,
    includedHiddenTypes: [...tmSoSetup.types.keys()],
  });

  return {
    schedule: async (task) => {
      const now = new Date();
      // Mirrors `taskInstanceToAttributes` (task_manager/server/task_store.ts) for the fields a
      // freshly-scheduled task needs; claiming/retry bookkeeping fields are left at their defaults
      // because nothing in this pod ever claims this document.
      const attributes = {
        taskType: task.taskType,
        params: JSON.stringify(task.params ?? {}),
        state: JSON.stringify(task.state ?? {}),
        status: TaskStatus.Idle,
        attempts: 0,
        scheduledAt: now.toISOString(),
        runAt: now.toISOString(),
        startedAt: null,
        retryAt: null,
        scope: task.scope,
        traceparent: '',
        enabled: true,
      };
      const created = await repository.create(TASK_SO_NAME, attributes, {
        id: task.id,
        refresh: false,
        namespace: task.spaceId && task.spaceId !== 'default' ? task.spaceId : undefined,
      });
      return { id: created.id };
    },
  };
};
