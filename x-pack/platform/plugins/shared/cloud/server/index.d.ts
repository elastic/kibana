/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
export type { CloudSetup, CloudStart } from './plugin';
export { config } from './config';
export declare const plugin: (
  initializerContext: PluginInitializerContext
) => Promise<import('./plugin').CloudPlugin>;
export { getOnboardingToken } from './saved_objects';
