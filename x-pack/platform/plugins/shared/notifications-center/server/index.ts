/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import type { PluginConfigDescriptor, PluginInitializer } from '@kbn/core/server';
import { NOTIFICATION_TYPE_FLAGS, NOTIFICATIONS_CENTER_UI_ENABLED_FLAG } from '../common';
import { configSchema, type NotificationsCenterConfig } from './config';
import type {
  NotificationsCenterPluginSetup,
  NotificationsCenterPluginStart,
  NotificationsCenterSetupDependencies,
  NotificationsCenterStartDependencies,
} from './types';

export type { NotificationsCenterPluginSetup, NotificationsCenterPluginStart } from './types';

/**
 * Notifications Center related feature flags for use with core feature flags service.
 * This includes the plugin visibility flag and per-notification-type flags.
 *
 * Notification type flags are declared in `common/feature_flags.ts`.
 * To allow more granular control of releasing different notification types,
 * each notification type has its own flag and is registered here by consumers.
 */
export const featureFlags: FeatureFlagDefinitions = [
  {
    key: NOTIFICATIONS_CENTER_UI_ENABLED_FLAG,
    name: 'Notifications Center UI',
    description: 'Enables the user-visible Notifications Center UI.',
    tags: ['notifications-center', 'search-kibana'],
    variationType: 'boolean',
    variations: [
      { name: 'Disabled', description: 'UI is hidden (default)', value: false },
      { name: 'Enabled', description: 'UI is shown', value: true },
    ],
  },
  {
    key: NOTIFICATION_TYPE_FLAGS.modelStatus,
    name: 'Model Status',
    description: 'Enables the Model Status notification type.',
    tags: ['notifications-center', 'search-kibana', 'inference'],
    variationType: 'boolean',
    variations: [
      { name: 'Disabled', description: 'Model Status is hidden (default)', value: false },
      { name: 'Enabled', description: 'Model Status is shown', value: true },
    ],
  },
];

export const config: PluginConfigDescriptor<NotificationsCenterConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  NotificationsCenterPluginSetup,
  NotificationsCenterPluginStart,
  NotificationsCenterSetupDependencies,
  NotificationsCenterStartDependencies
> = async (initializerContext) => {
  const { NotificationsCenterPlugin } = await import('./plugin');
  return new NotificationsCenterPlugin(initializerContext);
};
