/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { IntervalSchedule, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import { ALERTING_ESQL_TASK_TYPE } from '.';
import type { EsqlRulesTaskParams } from './types';

export function getEsqlRuleTaskId({ ruleId, spaceId }: { ruleId: string; spaceId: string }) {
  return `${ALERTING_ESQL_TASK_TYPE}:${spaceId}:${ruleId}`;
}

export async function ensureEsqlRuleTaskScheduled({
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
    /**
     * When provided, Task Manager will persist an apiKey + userScope on the task so the runner
     * can receive a `fakeRequest`.
     */
    request?: KibanaRequest;
  };
}) {
  const id = getEsqlRuleTaskId({ ruleId, spaceId });

  await taskManager.ensureScheduled(
    {
      id,
      taskType: ALERTING_ESQL_TASK_TYPE,
      schedule,
      params: {
        ruleId,
        spaceId,
      } satisfies EsqlRulesTaskParams,
      state: {},
      scope: ['alerting'],
      enabled: true,
    },
    request ? { request } : undefined
  );

  return { id };
}
