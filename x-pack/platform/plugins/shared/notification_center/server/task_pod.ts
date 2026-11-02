/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePodPlugin } from '@kbn/task-manager-plugin/server/task_pod';
import { registerNotificationCleanupTask } from './cleanup_task/cleanup_task';

/**
 * Runs Notification Center's tasks in a task pod. It registers through the same function
 * `plugin.ts` calls in Kibana, so a task behaves the same in either place.
 */
export const podPlugins = [
  definePodPlugin({
    id: 'notificationCenter',
    requiredPlugins: ['taskManager'],
    setup: (core, { taskManager }, context) => {
      registerNotificationCleanupTask(core, taskManager, context.logger.get() as never);
    },
  }),
];
