/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import type { PluginConfigDescriptor, PluginInitializer } from '@kbn/core/server';
import { NOTIFICATIONS_CENTER_UI_ENABLED_FLAG } from '../common';
import { configSchema, type NotificationsCenterConfig } from './config';
import type {
  NotificationsCenterPluginSetup,
  NotificationsCenterPluginStart,
  NotificationsCenterSetupDependencies,
  NotificationsCenterStartDependencies,
} from './types';

export type { NotificationsCenterPluginSetup, NotificationsCenterPluginStart } from './types';

/**
 * In-repo declaration of the Notifications Center feature flags. Defaults to
 * the OFF variation; the active default per environment is set by the
 * segmentation rules in the external `elastic/kibana-feature-flags` repo.
 *
 * Per-notification-type flags are declared here too as concrete types land:
 * append a static definition whose `key` is the literal from
 * `NOTIFICATION_TYPE_FLAGS` (in `common/feature_flags.ts`). Keys are never
 * generated at runtime so the full set stays statically discoverable. See the
 * per-type strategy in `common/feature_flags.ts`.
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
