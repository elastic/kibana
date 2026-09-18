/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskScheduling } from '../task_scheduling';

/**
 * Prototype-only demo task exercising the worker-process contract end-to-end on a live
 * Kibana. Registered and scheduled unconditionally (mirroring the other internal task types
 * registered by this plugin, e.g. `delete_inactive_nodes_task.ts`), but is a no-op unless
 * `xpack.task_manager.unsafe.worker_processes.enabled: true` - with the flag off, the claim-time
 * capacity check excludes worker task types from claim batches, so this task simply never runs.
 */
export const TASK_ID = 'worker_process_demo';
export const TASK_TYPE = `task_manager:${TASK_ID}`;
export const DEMO_INTERVAL = '10s';

export function registerWorkerProcessDemoTaskDefinition(taskTypeDictionary: TaskTypeDictionary) {
  taskTypeDictionary.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Worker process demo task (prototype)',
      description:
        'Recomputes a prime count on an increasing limit every run, entirely inside a worker process, to verify the worker-process prototype end-to-end on a live Kibana. No-op unless xpack.task_manager.unsafe.worker_processes.enabled is true.',
      workerModuleId: require.resolve('./demo_worker'),
      workerResources: { memoryMb: 10 },
      stateSchemaByVersion: {
        1: {
          up: (state: Record<string, unknown>) => state,
          schema: schema.object({
            runCount: schema.maybe(schema.number()),
            limit: schema.maybe(schema.number()),
            primeCount: schema.maybe(schema.number()),
            ranInWorkerProcess: schema.maybe(schema.boolean()),
            workerProcessPid: schema.maybe(schema.number()),
            lastRunAt: schema.maybe(schema.string()),
          }),
        },
      },
    },
  });
}

export async function scheduleWorkerProcessDemoTask(
  logger: Logger,
  taskScheduling: TaskScheduling
) {
  try {
    await taskScheduling.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval: DEMO_INTERVAL,
      },
      state: {},
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID} task, received ${e.message}`);
  }
}
