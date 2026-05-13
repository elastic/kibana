/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { FeatureFlagDefinitions } from '@kbn/core-feature-flags-server';
import { ONBOARDING_FEATURE_FLAG_DEFINITIONS } from '../common/feature_flag_definitions';

export const featureFlags: FeatureFlagDefinitions = ONBOARDING_FEATURE_FLAG_DEFINITIONS;

export async function plugin(initializerContext: PluginInitializerContext) {
  const { IngestHubServerPlugin } = await import('./plugin');
  return new IngestHubServerPlugin(initializerContext);
}

export type { IngestHubServerPluginSetup, IngestHubServerPluginStart } from './types';
