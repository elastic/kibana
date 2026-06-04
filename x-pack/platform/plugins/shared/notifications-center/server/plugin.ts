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
import {
  NOTIFICATION_TYPE_FLAGS,
  NOTIFICATIONS_CENTER_UI_ENABLED_DEFAULT,
  NOTIFICATIONS_CENTER_UI_ENABLED_FLAG,
} from '../common';
import type { NotificationsCenterConfig } from './config';
import type {
  NotificationsCenterPluginSetup,
  NotificationsCenterPluginStart,
  NotificationsCenterSetupDependencies,
  NotificationsCenterStartDependencies,
} from './types';

export class NotificationsCenterPlugin
  implements
    Plugin<
      NotificationsCenterPluginSetup,
      NotificationsCenterPluginStart,
      NotificationsCenterSetupDependencies,
      NotificationsCenterStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<NotificationsCenterConfig>) {
    this.logger = context.logger.get();
  }

  public setup(
    _core: CoreSetup<NotificationsCenterStartDependencies, NotificationsCenterPluginStart>
  ): NotificationsCenterPluginSetup {
    // Gated by `xpack.notificationsCenter.enabled` in kibana config
    this.logger.debug('Setting up Notifications Center plugin');
    return {};
  }

  public start(core: CoreStart): NotificationsCenterPluginStart {
    // Per the feature-flags service contract, evaluation
    // must never gate plugin setup — it is purely observational here.
    this.logResolvedFeatureFlags(core.featureFlags);
    return {};
  }

  public stop() {}

  private async logResolvedFeatureFlags(featureFlags: CoreStart['featureFlags']): Promise<void> {
    try {
      const uiEnabled = await featureFlags.getBooleanValue(
        NOTIFICATIONS_CENTER_UI_ENABLED_FLAG,
        NOTIFICATIONS_CENTER_UI_ENABLED_DEFAULT
      );
      const notificationTypeFlags = await Promise.all(
        Object.values(NOTIFICATION_TYPE_FLAGS).map((flag) =>
          featureFlags.getBooleanValue(flag, false)
        )
      );
      this.logger.debug(
        `Notifications Center feature flags resolved: ${JSON.stringify({
          uiEnabled,
          notificationTypeFlags,
        })}`
      );
    } catch (error) {
      this.logger.warn(`Failed to resolve Notifications Center feature flags: ${String(error)}`);
    }
  }
}
