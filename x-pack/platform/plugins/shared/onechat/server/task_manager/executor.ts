/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { taskTypes } from './task_definitions';

export const execute = async ({
  request,
  taskManager,
}: {
  request: KibanaRequest;
  taskManager: TaskManagerStartContract;
}) => {
  await taskManager.schedule(
    {
      id: 'some-id',
      taskType: taskTypes.runAgent,
      params: {
        executionId: 'TODO',
      },
      scope: ['agent-builder'],
      enabled: true,
      state: {},
    },
    { request }
  );
};
