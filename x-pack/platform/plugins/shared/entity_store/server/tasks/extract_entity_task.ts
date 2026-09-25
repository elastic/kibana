/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  RunContext,
  RunResult,
} from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import moment from 'moment';
import { TasksConfig, type EntityStoreTaskConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type * as types from '../types';
import type { EntityType, ExtractionMode } from '../../common/domain/definitions/entity_schema';
import { EXTRACTION_MODE } from '../../common/domain/definitions/entity_schema';
import { createLogsExtractionClient } from './factories';
import { isDualProcessEnabled } from '../infra/feature_flags';
import {
  hasPriorityExtractionGate,
  resolveExtractionMode,
} from '../../common/domain/definitions/registry';
import { ENGINE_STATUS } from '../domain/constants';
import {
  EngineDescriptorTypeName,
  EngineDescriptorClient,
  EntityStoreGlobalStateClient,
} from '../domain/saved_objects';
import { wrapTaskRun } from '../telemetry/traces';
import { buildExtractionAttributes, entityStoreMetrics } from '../monitor/metrics';
import { NonPriorityExtractionDisabledError } from '../domain/errors';
import { shouldDeleteOrphanedEntityStoreTask } from './should_delete_orphaned_task';
import { getMergedConfig } from '../domain/config';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

/** The priority and single processes share one task; non-priority has its own so the two can run
 * on independent schedules and be started, stopped and monitored separately. */
const TASK_CONFIG_BY_MODE = {
  single: TasksConfig[EntityStoreTaskType.enum.extractEntity],
  priority: TasksConfig[EntityStoreTaskType.enum.extractEntity],
  nonPriority: TasksConfig[EntityStoreTaskType.enum.extractEntityNonPriority],
} as const satisfies Record<ExtractionMode, EntityStoreTaskConfig>;

export function getExtractEntityTaskConfig(
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
): EntityStoreTaskConfig {
  return TASK_CONFIG_BY_MODE[extractionMode];
}

function getTaskType(
  entityType: EntityType,
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
): string {
  return `${getExtractEntityTaskConfig(extractionMode).type}:${entityType}`;
}

export function getExtractEntityTaskId(
  entityType: EntityType,
  namespace: string,
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
): string {
  return `${getTaskType(entityType, extractionMode)}:${namespace}`;
}

export const getNewSchedule = (
  frequency: string,
  taskInstance: ConcreteTaskInstance
): { schedule: IntervalSchedule } | undefined => {
  const currentInterval = taskInstance.schedule?.interval;
  if (currentInterval !== frequency) {
    return {
      schedule: {
        interval: frequency,
      },
    };
  }
};

/**
 * Ensures the non-priority task exists and that nonPriorityStatus is initialised for engines
 * that predate model version 10 (where the field was introduced). Called on every shared-task
 * tick; ensureScheduled is idempotent so repeated calls are cheap no-ops once the task exists.
 * The SO update only fires when nonPriorityStatus is null (first run after upgrade).
 */
async function bootstrapNonPriorityTask({
  core,
  fakeRequest,
  entityType,
  namespace,
  dualProcessEnabled,
  logger,
}: {
  core: types.EntityStoreCoreSetup;
  fakeRequest: KibanaRequest;
  entityType: EntityType;
  namespace: string;
  dualProcessEnabled: boolean;
  logger: Logger;
}): Promise<void> {
  try {
    const [coreStart, pluginsStart] = await core.getStartServices();

    const soClient = coreStart.savedObjects.createInternalRepository([EngineDescriptorTypeName]);
    const engineDescriptorClient = new EngineDescriptorClient(
      soClient as unknown as SavedObjectsClientContract,
      namespace,
      logger,
      true
    );
    const globalStateClient = new EntityStoreGlobalStateClient(
      coreStart.savedObjects.getUnsafeInternalClient().asScopedToNamespace(namespace),
      namespace,
      logger
    );
    const [descriptor, globalOverrides] = await Promise.all([
      engineDescriptorClient.findOrThrow(entityType),
      globalStateClient.findLogExtractionOverrides(),
    ]);

    // Skip scheduling for stopped engines: stop()/uninstall() remove both tasks and this tick
    // must not recreate the non-priority one.
    if (descriptor.status !== ENGINE_STATUS.STARTED) {
      return;
    }

    const { frequency } = getMergedConfig(
      entityType,
      globalOverrides,
      descriptor.logExtractionConfig,
      EXTRACTION_MODE.nonPriority,
      descriptor.nonPriorityLogExtractionConfig
    );

    await pluginsStart.taskManager.ensureScheduled(
      {
        id: getExtractEntityTaskId(entityType, namespace, EXTRACTION_MODE.nonPriority),
        taskType: `${getExtractEntityTaskConfig(EXTRACTION_MODE.nonPriority).type}:${entityType}`,
        schedule: { interval: frequency },
        state: { namespace },
        params: {},
      },
      { request: fakeRequest }
    );

    if (descriptor.nonPriorityStatus === null || descriptor.nonPriorityStatus === undefined) {
      await engineDescriptorClient.update(entityType, {
        nonPriorityStatus: dualProcessEnabled ? ENGINE_STATUS.STARTED : ENGINE_STATUS.STOPPED,
      });
    }
  } catch (err) {
    logger.warn(
      `Non-priority task bootstrap failed for ${entityType} in ${namespace}: ${
        (err as Error).message
      }`
    );
  }
}

async function runTask({
  taskInstance,
  fakeRequest,
  signal,
  entityType,
  logger,
  core,
  isServerless,
  extractionMode: registeredExtractionMode,
}: RunContext & {
  entityType: EntityType;
  logger: Logger;
  core: types.EntityStoreCoreSetup;
  isServerless: boolean;
  /** The mode this task is registered for. The shared task registers as `single` and resolves
   * `single` vs `priority` from the flag per run; the non-priority task registers as
   * `nonPriority`, which the flag never resolves to. */
  extractionMode: ExtractionMode;
}): Promise<RunResult> {
  logger.info(`Running extract entity task`);

  const currentState = taskInstance.state;
  const runs = currentState.runs || 0;
  const namespace = currentState.namespace;

  const [coreStart] = await core.getStartServices();
  const dualProcessEnabled = await isDualProcessEnabled(coreStart.featureFlags);

  // Orphan check runs before the dual-process gate so an uninstalled store can still self-delete
  // a stranded non-priority task even when the flag is off.
  if (
    await shouldDeleteOrphanedEntityStoreTask({
      coreStart,
      namespace,
      logger,
    })
  ) {
    return {
      state: currentState,
      shouldDeleteTask: true,
    };
  }

  // The task definitions are registered unconditionally, so the flag is read per run: it can be
  // flipped while a task is already scheduled. Non-priority extraction only exists in dual-process
  // mode, so with the flag off this run does nothing rather than falling back to another mode.
  if (registeredExtractionMode === EXTRACTION_MODE.nonPriority && !dualProcessEnabled) {
    return { state: currentState };
  }

  const extractionMode =
    registeredExtractionMode === EXTRACTION_MODE.nonPriority
      ? registeredExtractionMode
      : resolveExtractionMode(dualProcessEnabled, entityType);

  if (!fakeRequest) {
    logger.error(`No fake request found, skipping extract entity task`);
    return {
      state: {
        ...currentState,
      },
    };
  }

  if (
    hasPriorityExtractionGate(entityType) &&
    registeredExtractionMode !== EXTRACTION_MODE.nonPriority
  ) {
    await bootstrapNonPriorityTask({
      core,
      fakeRequest,
      entityType,
      namespace,
      dualProcessEnabled,
      logger,
    });
  }

  let remote = false;
  const metricAttributes = () =>
    buildExtractionAttributes(entityType, namespace, extractionMode, remote);

  const extractionStart = Date.now();

  try {
    const { logsExtractionClient } = await createLogsExtractionClient({
      core,
      fakeRequest,
      logger,
      namespace,
      isServerless,
      extractionMode,
    });

    const extractionResult = await logsExtractionClient.extractLogs(entityType, {
      signal,
    });
    const extractionDuration = moment().diff(extractionStart, 'milliseconds');

    remote = extractionResult.isRemote;

    if (extractionResult.success) {
      logger.info(
        `Successfully extracted ${extractionResult.count} entities for ${entityType}, took ${extractionDuration}ms  `
      );
      entityStoreMetrics.extractionTaskSuccess.add(1, metricAttributes());
    } else if (extractionResult.error instanceof NonPriorityExtractionDisabledError) {
      // Not a failure: the non-priority process is switched off and this tick did nothing.
      // Counting it as an extraction error would make an idle process look permanently broken.
      logger.debug(
        `Non-priority extraction skipped for ${entityType}: ${extractionResult.error.message}`
      );
    } else {
      logger.error(
        `Logs extraction failed for ${entityType}: ${extractionResult.error.message}, took ${extractionDuration}ms`
      );
      entityStoreMetrics.extractionTaskError.add(1, {
        ...metricAttributes(),
        error_type: extractionResult.error.name ?? 'UnknownError',
      });
    }

    const updatedState = {
      namespace,
      lastExecutionTimestamp: new Date().toISOString(),
      runs: runs + 1,
      entityType,
      lastExtractionSuccess: extractionResult.success,
      status: 'success',
    };

    let schedule: { schedule: IntervalSchedule } | undefined;
    try {
      const config = await logsExtractionClient.getMergedConfigForType(entityType);
      schedule = getNewSchedule(config.frequency, taskInstance);
    } catch (e) {
      logger.warn(`Error getting new schedule, received ${e.message}`);
    }
    return {
      state: updatedState,
      ...schedule,
    };
  } catch (e) {
    logger.error(`Error running extract entity task, received ${e.message}`);

    entityStoreMetrics.extractionTaskError.add(1, {
      ...metricAttributes(),
      error_type: e.name ?? 'UnknownError',
    });

    return {
      state: {
        ...currentState,
        lastError: e.message,
        lastErrorTimestamp: new Date().toISOString(),
        status: 'error',
        entityType,
      },
    };
  } finally {
    entityStoreMetrics.extractionTaskDurationMs.record(
      moment().diff(extractionStart, 'milliseconds'),
      metricAttributes()
    );
  }
}

export function registerExtractEntityTasks({
  taskManager,
  logger,
  entityTypes,
  core,
  isServerless,
}: {
  core: types.EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  entityTypes: EntityType[];
  isServerless: boolean;
}): void {
  try {
    entityTypes.forEach((type) => {
      // Single and priority share this task, so registering it as 'single' covers both.
      registerOne({ taskManager, logger, core, isServerless, type });

      // Unconditional: setup runs before the flag is readable, and the flag gates execution.
      if (hasPriorityExtractionGate(type)) {
        registerOne({
          taskManager,
          logger,
          core,
          isServerless,
          type,
          extractionMode: EXTRACTION_MODE.nonPriority,
        });
      }
    });
  } catch (e) {
    logger.error(`Error registering extract entity tasks, received ${e.message}`);
    throw e;
  }
}

function registerOne({
  taskManager,
  logger,
  core,
  isServerless,
  type,
  extractionMode = EXTRACTION_MODE.single,
}: {
  core: types.EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  isServerless: boolean;
  type: EntityType;
  extractionMode?: ExtractionMode;
}): void {
  const config = getExtractEntityTaskConfig(extractionMode);
  const taskType = getTaskType(type, extractionMode);

  taskManager.registerTaskDefinitions({
    [taskType]: {
      title: config.title,
      timeout: config.timeout,
      createTaskRunner: ({
        taskInstance,
        signal,
        fakeRequest,
        executionUuid,
        setCustomTaskRunEventFields,
      }) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          return coreStart.executionContext.withContext(
            buildEaExecutionContext(
              EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_EXTRACT_TASK,
              taskInstance.id
            ),
            () =>
              wrapTaskRun({
                spanName: 'entityStore.task.extract_entity.run',
                namespace: taskInstance.state.namespace,
                attributes: {
                  'entity_store.task.id': taskInstance.id,
                  'entity_store.task.type': taskType,
                  'entity_store.entity.type': type,
                },
                run: () =>
                  runTask({
                    taskInstance,
                    signal,
                    executionUuid,
                    setCustomTaskRunEventFields,
                    logger: logger.get(taskInstance.id),
                    core,
                    entityType: type,
                    fakeRequest,
                    isServerless,
                    extractionMode,
                  }),
              })
          );
        },
      }),
    },
  });
}

export async function scheduleExtractEntityTask({
  logger,
  taskManager,
  type,
  namespace,
  frequency,
  request,
  extractionMode = EXTRACTION_MODE.single,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  type: EntityType;
  frequency: string;
  namespace: string;
  request: KibanaRequest;
  extractionMode?: ExtractionMode;
}): Promise<void> {
  try {
    const taskType = getTaskType(type, extractionMode);
    const taskId = getExtractEntityTaskId(type, namespace, extractionMode);
    const interval = frequency ?? getExtractEntityTaskConfig(extractionMode).interval;
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType,
        schedule: { interval },
        state: { namespace },
        params: {},
      },
      { request }
    );
  } catch (e) {
    logger.error(`Error scheduling extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function stopExtractEntityTask({
  taskManager,
  logger,
  type,
  namespace,
  extractionMode = EXTRACTION_MODE.single,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  type: EntityType;
  namespace: string;
  extractionMode?: ExtractionMode;
}): Promise<void> {
  const taskId = getExtractEntityTaskId(type, namespace, extractionMode);
  await taskManager.removeIfExists(taskId);
  logger.debug(`removed extract entity task: ${taskId}`);
}
