/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { NotificationCenterConfig } from './config';
import {
  registerNotificationCleanupTask,
  scheduleNotificationCleanupTask,
} from './cleanup_task/cleanup_task';
import { registerNotificationDataStream } from './storage/notification_data_stream';
import { buildForType } from './lib/submit';
import { registerNotificationUserStorage } from './storage/user_storage';
import type {
  NotificationCenterPluginSetup,
  NotificationCenterPluginStart,
  NotificationCenterSetupDependencies,
  NotificationCenterStartDependencies,
} from './types';

export class NotificationCenterPlugin
  implements
    Plugin<
      NotificationCenterPluginSetup,
      NotificationCenterPluginStart,
      NotificationCenterSetupDependencies,
      NotificationCenterStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<NotificationCenterConfig>) {
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>,
    plugins: NotificationCenterSetupDependencies
  ): NotificationCenterPluginSetup {
    // core gates the plugin on xpack.notificationCenter.enabled;
    this.logger.debug('Setting up Notification Center plugin');

    registerNotificationDataStream(core.dataStreams);
    registerNotificationUserStorage(core.userStorage);
    registerNotificationCleanupTask(core, plugins.taskManager, this.logger);

    return {
      forType: buildForType(core),
    };
  }

  public start(
    _core: CoreStart,
    plugins: NotificationCenterStartDependencies
  ): NotificationCenterPluginStart {
    scheduleNotificationCleanupTask(plugins.taskManager).catch((err) => {
      this.logger.error(`Failed to schedule Notification Center cleanup task: ${err.message}`);
    });

    return {};
  }

  public stop() {}
}
