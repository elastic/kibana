/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { IntervalSchedule } from '@kbn/task-manager-plugin/server';

import { ALERTING_ESQL_TASK_TYPE } from '.';
import type { EsqlRulesTaskParams } from './types';

export function getEsqlRuleTaskId({ ruleId, spaceId }: { ruleId: string; spaceId: string }) {
  // Keep this distinct from the legacy `alerting:${ruleTypeId}` tasks which use the ruleId as task id.
  return `${ALERTING_ESQL_TASK_TYPE}:${spaceId}:${ruleId}`;
}

export async function ensureEsqlRuleTaskScheduled({
  services: { taskManager },
  input: { ruleId, spaceId, consumer, schedule },
}: {
  services: {
    taskManager: TaskManagerStartContract;
  };
  input: {
    ruleId: string;
    spaceId: string;
    consumer?: string;
    schedule: IntervalSchedule;
  };
}) {
  const id = getEsqlRuleTaskId({ ruleId, spaceId });

  await taskManager.ensureScheduled({
    id,
    taskType: ALERTING_ESQL_TASK_TYPE,
    schedule,
    params: {
      ruleId,
      spaceId,
      ...(consumer ? { consumer } : {}),
    } satisfies EsqlRulesTaskParams,
    state: {},
    scope: ['alerting'],
    enabled: true,
  });

  return { id };
}
