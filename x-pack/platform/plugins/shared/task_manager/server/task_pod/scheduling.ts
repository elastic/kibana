/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { Logger } from '@kbn/core/server';
import { definePodPlugin } from './host/define_pod_plugin';
import { TASK_MANAGER_INDEX } from '../constants';
import { createInitialMiddleware } from '../lib/middleware';
import { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import { removeIfExists } from '../lib/remove_if_exists';
import { EsApiKeyStrategy } from '../api_key_strategy/es_api_key_strategy';
import { setupSavedObjects, TASK_SO_NAME, INVALIDATE_API_KEY_SO_NAME } from '../saved_objects';
import { TASK_ENCRYPTED_TYPES } from '../saved_objects/encrypted_types';
import { TaskScheduling } from '../task_scheduling';
import { TaskStore } from '../task_store';
import { TaskTypeDictionary } from '../task_type_dictionary';

/**
 * Task Manager's scheduling half, running in the pod: tasks scheduled from a run are written to
 * `.kibana_task_manager` by the pod itself (API key cloned through Elasticsearch, encrypted with the
 * pod's Encrypted Saved Objects key), and Kibana's task pollers claim them as usual. A task family
 * that schedules other task types adds this to its pod so a run needs no call back to Kibana.
 *
 * Only API-key scheduling on Elasticsearch is covered (not UIAM keys, claiming or running tasks).
 * The task types to schedule are listed because Task Manager validates a task type before writing it;
 * the pod doesn't validate their params or state, which the claiming node does when it runs them.
 */
export const createTaskSchedulingPodPlugin = ({ taskTypes }: { taskTypes: string[] }) =>
  definePodPlugin({
    id: 'taskScheduling',
    requiredPlugins: ['encryptedSavedObjects'],
    setup: (core, { encryptedSavedObjects }) => {
      setupSavedObjects(core.savedObjects);
      TASK_ENCRYPTED_TYPES.forEach((registration) =>
        encryptedSavedObjects.registerType(registration)
      );
    },
    start: (core, { encryptedSavedObjects }, context) => {
      const logger = context.logger.get('taskScheduling') as Logger;
      const definitions = new TaskTypeDictionary(logger);
      definitions.registerTaskDefinitions(
        Object.fromEntries(
          taskTypes.map((taskType) => [
            taskType,
            {
              title: taskType,
              createTaskRunner: () => {
                throw new Error(
                  `Task type '${taskType}' runs on the node that claims it, not in a pod`
                );
              },
            },
          ])
        )
      );

      const taskStore = new TaskStore({
        serializer: core.savedObjects.createSerializer(),
        savedObjectsRepository: core.savedObjects.createInternalRepository([
          TASK_SO_NAME,
          INVALIDATE_API_KEY_SO_NAME,
        ]),
        savedObjectsService: core.savedObjects,
        esClient: core.elasticsearch.client.asInternalUser,
        index: TASK_MANAGER_INDEX,
        definitions,
        taskManagerId: `pod:${randomUUID()}`,
        adHocTaskCounter: new AdHocTaskCounter(),
        allowReadingInvalidState: true,
        logger,
        security: core.security,
        canEncryptSavedObjects: true,
        esoClient: encryptedSavedObjects.getClient({
          includedHiddenTypes: [TASK_SO_NAME, INVALIDATE_API_KEY_SO_NAME],
        }),
        getIsSecurityEnabled: () => true,
        executionContext: { withContext: (_ctx: unknown, fn: () => unknown) => fn() } as never,
        apiKeyStrategy: new EsApiKeyStrategy(),
      });
      const taskScheduling = new TaskScheduling({
        logger,
        taskStore,
        middleware: createInitialMiddleware(),
        taskManagerId: taskStore.taskManagerId,
        definitions,
      });

      return {
        fetch: taskStore.fetch.bind(taskStore),
        aggregate: taskStore.aggregate.bind(taskStore),
        get: taskStore.get.bind(taskStore),
        bulkGet: taskStore.bulkGet.bind(taskStore),
        remove: taskStore.remove.bind(taskStore),
        bulkRemove: taskStore.bulkRemove.bind(taskStore),
        removeIfExists: (id: string) => removeIfExists(taskStore, id),
        schedule: taskScheduling.schedule.bind(taskScheduling),
        bulkSchedule: taskScheduling.bulkSchedule.bind(taskScheduling),
        ensureScheduled: taskScheduling.ensureScheduled.bind(taskScheduling),
        runSoon: taskScheduling.runSoon.bind(taskScheduling),
        bulkEnable: taskScheduling.bulkEnable.bind(taskScheduling),
        bulkDisable: taskScheduling.bulkDisable.bind(taskScheduling),
        bulkUpdateSchedules: taskScheduling.bulkUpdateSchedules.bind(taskScheduling),
        bulkUpdateState: taskScheduling.bulkUpdateState.bind(taskScheduling),
        getRegisteredTypes: () => definitions.getAllTypes(),
      };
    },
  });
