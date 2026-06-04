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
  NOTIFICATION_CENTER_UI_ENABLED_DEFAULT,
  NOTIFICATION_CENTER_UI_ENABLED_FLAG,
} from '../common';
import type { NotificationCenterConfig } from './config';
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
    _core: CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>
  ): NotificationCenterPluginSetup {
    // Gated by `xpack.notificationCenter.enabled` in kibana config
    this.logger.debug('Setting up Notification Center plugin');
    return {};
  }

  public start(core: CoreStart): NotificationCenterPluginStart {
    // Per the feature-flags service contract, evaluation
    // must never gate plugin setup — it is purely observational here.
    this.logResolvedFeatureFlags(core.featureFlags);
    return {};
  }

  public stop() {}

  /**
   * Provide visibility to the resolved feature flags values for debugging purposes
   * @param featureFlags
   */
  private async logResolvedFeatureFlags(featureFlags: CoreStart['featureFlags']): Promise<void> {
    try {
      const uiEnabled = await featureFlags.getBooleanValue(
        NOTIFICATION_CENTER_UI_ENABLED_FLAG,
        NOTIFICATION_CENTER_UI_ENABLED_DEFAULT
      );
      const notificationTypeFlags = await Promise.all(
        Object.values(NOTIFICATION_TYPE_FLAGS).map((flag) =>
          featureFlags.getBooleanValue(flag, false)
        )
      );
      this.logger.debug(
        `Notification Center feature flags resolved: ${JSON.stringify({
          uiEnabled,
          notificationTypeFlags,
        })}`
      );
    } catch (error) {
      this.logger.warn(`Failed to resolve Notification Center feature flags: ${String(error)}`);
    }
  }
}
