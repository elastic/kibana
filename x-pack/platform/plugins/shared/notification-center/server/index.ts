/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializer } from '@kbn/core/server';
import { configSchema, type NotificationCenterConfig } from './config';
import type {
  NotificationCenterPluginSetup,
  NotificationCenterPluginStart,
  NotificationCenterSetupDependencies,
  NotificationCenterStartDependencies,
} from './types';

export type { NotificationCenterPluginSetup, NotificationCenterPluginStart } from './types';

/**
 * Notification Center feature flags are managed via GitOps: their authoritative
 * definitions (variations, default variation per environment, and segmentation
 * rules) live as YAML in the external `elastic/kibana-feature-flags` repository,
 * which transpiles them to Terraform and applies them to LaunchDarkly.
 *
 * Kibana only references the flag keys (see `common/feature_flags.ts`) and
 * evaluates them with a `false` fallback. There is no in-repo flag-definition
 * registration step — adding or changing a flag is a YAML PR against that repo.
 */
export const config: PluginConfigDescriptor<NotificationCenterConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  NotificationCenterPluginSetup,
  NotificationCenterPluginStart,
  NotificationCenterSetupDependencies,
  NotificationCenterStartDependencies
> = async (initializerContext) => {
  const { NotificationCenterPlugin } = await import('./plugin');
  return new NotificationCenterPlugin(initializerContext);
};
