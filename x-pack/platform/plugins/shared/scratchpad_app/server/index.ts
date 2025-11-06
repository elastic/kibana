/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ScratchpadAppConfig } from './config';
import { ScratchpadAppPlugin } from './plugin';
import type {
  ScratchpadAppServerSetup,
  ScratchpadAppServerStart,
  ScratchpadAppSetupDependencies,
  ScratchpadAppStartDependencies,
} from './types';

export type { ScratchpadAppServerSetup, ScratchpadAppServerStart };

import { config as configSchema } from './config';

export const config: PluginConfigDescriptor<ScratchpadAppConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  ScratchpadAppServerSetup,
  ScratchpadAppServerStart,
  ScratchpadAppSetupDependencies,
  ScratchpadAppStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<ScratchpadAppConfig>) =>
  new ScratchpadAppPlugin(pluginInitializerContext);
