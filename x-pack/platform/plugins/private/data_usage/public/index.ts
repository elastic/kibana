/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  DataUsagePublicSetup,
  DataUsagePublicStart,
  DataUsageSetupDependencies,
  DataUsageStartDependencies,
} from './types';
import { DataUsagePlugin } from './plugin';

export type { DataUsagePublicSetup, DataUsagePublicStart } from './types';

export const plugin: PluginInitializer<
  DataUsagePublicSetup,
  DataUsagePublicStart,
  DataUsageSetupDependencies,
  DataUsageStartDependencies
> = (pluginInitializerContext: PluginInitializerContext) =>
  new DataUsagePlugin(pluginInitializerContext);
