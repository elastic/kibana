/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { RulesClientContext } from '../types';
import { ScheduleTaskOptions } from '../types';

export async function scheduleTask(context: RulesClientContext, opts: ScheduleTaskOptions) {
  const { id, consumer, ruleTypeId, schedule, throwOnConflict } = opts;
  const taskInstance = {
    id, // use the same ID for task document as the rule
    taskType: `alerting:${ruleTypeId}`,
    schedule,
    params: {
      alertId: id,
      spaceId: context.spaceId,
      consumer,
    },
    state: {
      previousStartedAt: null,
      alertTypeState: {},
      alertInstances: {},
    },
    scope: ['alerting'],
    enabled: true,
  };
  try {
    return await withSpan({ name: 'taskManager.schedule', type: 'rules' }, () =>
      context.taskManager.schedule(taskInstance)
    );
  } catch (err) {
    if (err.statusCode === 409 && !throwOnConflict) {
      return taskInstance;
    }
    throw err;
  }
}
