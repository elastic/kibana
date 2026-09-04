/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { IntervalSchedule, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '.';
import type { RuleExecutorTaskParams } from './types';

export function getRuleExecutorTaskId({ ruleId, spaceId }: { ruleId: string; spaceId: string }) {
  return `${ALERTING_RULE_EXECUTOR_TASK_TYPE}:${spaceId}:${ruleId}`;
}

export function buildRuleExecutorTaskInstance({
  ruleId,
  spaceId,
  schedule,
}: {
  ruleId: string;
  spaceId: string;
  schedule: IntervalSchedule;
}) {
  return {
    id: getRuleExecutorTaskId({ ruleId, spaceId }),
    taskType: ALERTING_RULE_EXECUTOR_TASK_TYPE,
    schedule,
    params: {
      ruleId,
      spaceId,
    } satisfies RuleExecutorTaskParams,
    state: {},
    scope: ['alerting'],
    enabled: true as const,
  };
}

export async function ensureRuleExecutorTaskScheduled({
  services: { taskManager },
  input: { ruleId, spaceId, schedule, request },
}: {
  services: {
    taskManager: TaskManagerStartContract;
  };
  input: {
    ruleId: string;
    spaceId: string;
    schedule: IntervalSchedule;
    request: KibanaRequest;
  };
}) {
  const taskInstance = buildRuleExecutorTaskInstance({ ruleId, spaceId, schedule });

  await taskManager.ensureScheduled(taskInstance, { request, cloneApiKey: true });

  return { id: taskInstance.id };
}

export async function bulkScheduleRuleExecutorTasks({
  services: { taskManager },
  input: { items, request },
}: {
  services: {
    taskManager: TaskManagerStartContract;
  };
  input: {
    items: Array<{ ruleId: string; spaceId: string; schedule: IntervalSchedule }>;
    request: KibanaRequest;
  };
}) {
  if (items.length === 0) {
    return [];
  }

  return taskManager.bulkSchedule(
    items.map((item) => buildRuleExecutorTaskInstance(item)),
    { request, cloneApiKey: true }
  );
}
