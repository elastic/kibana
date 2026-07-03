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
import { registerNotificationDataStream } from './data_stream/notification_data_stream';
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
    core: CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>
  ): NotificationCenterPluginSetup {
    // core gates the plugin on xpack.notificationCenter.enabled; setup runs only when enabled
    this.logger.debug('Setting up Notification Center plugin');

    registerNotificationDataStream(core.dataStreams);

    return {};
  }

  public start(core: CoreStart): NotificationCenterPluginStart {
    return {};
  }

  public stop() {}
}
