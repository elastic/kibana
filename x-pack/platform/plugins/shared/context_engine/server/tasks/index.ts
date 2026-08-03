/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  CASE_BUILDER_TASK_TYPE,
  SELF_IMPROVEMENT_SCHEDULE_INTERVAL,
  TRACE_CLASSIFIER_TASK_TYPE,
  caseBuilderTaskId,
  traceClassifierTaskId,
} from '../../common/constants';
import { registerCaseBuilderTask } from './case_builder_task';
import { registerTraceClassifierTask } from './trace_classifier_task';

export const registerSelfImprovementTasks = (
  taskManager: TaskManagerSetupContract,
  deps: {
    core: CoreSetup;
    logger: Logger;
    getTaskManager: () => TaskManagerStartContract | undefined;
  }
) => {
  registerCaseBuilderTask(taskManager, deps);
  registerTraceClassifierTask(taskManager, deps);
};

/** Schedules the recurring case_builder + trace_classifier tasks for an AI index. */
export const scheduleSelfImprovement = async (
  taskManager: TaskManagerStartContract,
  { aiIndexId, tracesIndex }: { aiIndexId: string; tracesIndex: string }
): Promise<void> => {
  await taskManager.ensureScheduled({
    id: caseBuilderTaskId(aiIndexId),
    taskType: CASE_BUILDER_TASK_TYPE,
    schedule: { interval: SELF_IMPROVEMENT_SCHEDULE_INTERVAL },
    params: { aiIndexId, tracesIndex },
    state: {},
  });
  await taskManager.ensureScheduled({
    id: traceClassifierTaskId(aiIndexId),
    taskType: TRACE_CLASSIFIER_TASK_TYPE,
    schedule: { interval: SELF_IMPROVEMENT_SCHEDULE_INTERVAL },
    params: { aiIndexId },
    state: {},
  });
};

export const unscheduleSelfImprovement = async (
  taskManager: TaskManagerStartContract,
  aiIndexId: string
): Promise<void> => {
  await taskManager.removeIfExists(caseBuilderTaskId(aiIndexId));
  await taskManager.removeIfExists(traceClassifierTaskId(aiIndexId));
};
