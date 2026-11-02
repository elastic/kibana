/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { TaskManagerTasksSetup } from '@kbn/task-manager-plugin/server/tasks';
import { registerNotificationCleanupTask } from '../cleanup_task/cleanup_task';

/**
 * Notification Center's tasks. It registers through the same function `plugin.ts` calls in Kibana,
 * so a task behaves the same in either place.
 */
class NotificationCenterTasksPlugin
  implements TasksPlugin<void, void, { taskManager: TaskManagerTasksSetup }>
{
  constructor(private readonly context: PluginInitializerContext) {}

  setup(core: CoreTasksSetup, { taskManager }: { taskManager: TaskManagerTasksSetup }) {
    registerNotificationCleanupTask(core as never, taskManager as never, this.context.logger.get());
  }

  start() {}
}

export const plugin = async (context: PluginInitializerContext) =>
  new NotificationCenterTasksPlugin(context);
