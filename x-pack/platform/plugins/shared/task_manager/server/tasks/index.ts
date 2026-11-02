/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import { randomUUID } from 'node:crypto';
import type {
  CoreTasksSetup,
  CoreTasksStart,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '../plugin';
import { taskManagerBridge } from './bridge';
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
import type { TaskDefinitionRegistry } from '../task_type_dictionary';

/**
 * A task type's definition as registered through `registerTaskDefinitions`. A task runtime reads
 * these to know which task types it can run.
 */
export type TaskManagerTasksDefinitions = Map<
  string,
  TaskDefinitionRegistry[string] & { taskType: string }
>;

export type TaskManagerTasksSetup = Pick<
  TaskManagerSetupContract,
  'index' | 'registerTaskDefinitions' | 'registerCanEncryptedSavedObjects' | 'addMiddleware'
> & {
  registerTaskEventLogger: TaskManagerSetupContract['registerTaskEventLogger'];
  /** Task definitions registered through this entry (standalone runtimes only). */
  getRegisteredTaskDefinitions: () => TaskManagerTasksDefinitions;
};

export type TaskManagerTasksStart = Pick<
  TaskManagerStartContract,
  | 'fetch'
  | 'aggregate'
  | 'get'
  | 'bulkGet'
  | 'remove'
  | 'bulkRemove'
  | 'removeIfExists'
  | 'schedule'
  | 'bulkSchedule'
  | 'ensureScheduled'
  | 'runSoon'
  | 'bulkEnable'
  | 'bulkDisable'
  | 'bulkUpdateSchedules'
  | 'bulkUpdateState'
  | 'getRegisteredTypes'
>;

// The members of Encrypted Saved Objects' tasks contracts used here, declared structurally: that
// plugin's TypeScript project already references this one.
interface TasksSetupDeps {
  encryptedSavedObjects: {
    registerType: (registration: (typeof TASK_ENCRYPTED_TYPES)[number]) => void;
  };
}
interface TasksStartDeps {
  encryptedSavedObjects: {
    getClient: (options?: { includedHiddenTypes?: string[] }) => unknown;
  };
}

/**
 * Task types a standalone runtime can schedule but not run: Task Manager validates a task type
 * before writing it, and the node that claims the task validates its params and state.
 */
class ScheduleOnlyTaskTypeDictionary extends TaskTypeDictionary {
  public has() {
    return true;
  }
  public ensureHas() {}
}

/**
 * Task Manager for task runtimes. In Kibana it hands out the real contracts. In a task pod it is
 * the registration half (task definitions are captured for the pod to run) and the scheduling half:
 * tasks scheduled from a run are written to `.kibana_task_manager` by the pod itself (API key cloned
 * through Elasticsearch, encrypted with the Encrypted Saved Objects key), and Kibana's pollers claim
 * them as usual. Claiming and running tasks, and UIAM keys, are not covered.
 */
class TaskManagerTasksPlugin
  implements
    TasksPlugin<TaskManagerTasksSetup, TaskManagerTasksStart, TasksSetupDeps, TasksStartDeps>
{
  private readonly logger: Logger;
  private readonly registered: TaskManagerTasksDefinitions = new Map();

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreTasksSetup, { encryptedSavedObjects }: TasksSetupDeps): TaskManagerTasksSetup {
    const real = taskManagerBridge.getSetup();
    if (real) {
      return { ...real, getRegisteredTaskDefinitions: () => this.registered };
    }

    setupSavedObjects(core.savedObjects as never);
    TASK_ENCRYPTED_TYPES.forEach((registration) =>
      encryptedSavedObjects.registerType(registration)
    );
    return {
      index: TASK_MANAGER_INDEX,
      addMiddleware: () => undefined,
      registerTaskDefinitions: (definitions) => {
        for (const [taskType, definition] of Object.entries(definitions)) {
          this.registered.set(taskType, { ...definition, taskType });
        }
      },
      registerCanEncryptedSavedObjects: () => undefined,
      registerTaskEventLogger: () => undefined,
      getRegisteredTaskDefinitions: () => this.registered,
    };
  }

  start(core: CoreTasksStart, { encryptedSavedObjects }: TasksStartDeps): TaskManagerTasksStart {
    const real = taskManagerBridge.getStart();
    if (real) return real;

    const definitions = new ScheduleOnlyTaskTypeDictionary(this.logger);
    const taskStore = new TaskStore({
      serializer: core.savedObjects.createSerializer(),
      savedObjectsRepository: core.savedObjects.createInternalRepository([
        TASK_SO_NAME,
        INVALIDATE_API_KEY_SO_NAME,
      ]),
      savedObjectsService: core.savedObjects as never,
      esClient: core.elasticsearch.client.asInternalUser,
      index: TASK_MANAGER_INDEX,
      definitions,
      taskManagerId: `pod:${randomUUID()}`,
      adHocTaskCounter: new AdHocTaskCounter(),
      allowReadingInvalidState: true,
      logger: this.logger,
      security: core.security,
      canEncryptSavedObjects: true,
      esoClient: encryptedSavedObjects.getClient({
        includedHiddenTypes: [TASK_SO_NAME, INVALIDATE_API_KEY_SO_NAME],
      }) as never,
      getIsSecurityEnabled: () => true,
      executionContext: { withContext: (_ctx: unknown, fn: () => unknown) => fn() } as never,
      apiKeyStrategy: new EsApiKeyStrategy(),
    });
    const taskScheduling = new TaskScheduling({
      logger: this.logger,
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
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new TaskManagerTasksPlugin(context);
