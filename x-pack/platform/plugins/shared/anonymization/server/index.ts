/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { AnonymizationPluginSetup, AnonymizationPluginStart } from './types';
import type { AnonymizationSetupDeps, AnonymizationStartDeps } from './plugin';

export const plugin: PluginInitializer<
  AnonymizationPluginSetup,
  AnonymizationPluginStart,
  AnonymizationSetupDeps,
  AnonymizationStartDeps
> = async (initializerContext: PluginInitializerContext) => {
  const { AnonymizationPlugin } = await import('./plugin');
  return new AnonymizationPlugin(initializerContext);
};

export type { AnonymizationPluginSetup, AnonymizationPluginStart } from './types';
export type {
  AnonymizationPolicyService,
  AnonymizationTarget,
  AnonymizationProfileInitializer,
  AnonymizationProfileInitializerContext,
  CreateAnonymizationProfileParams,
} from './types';
