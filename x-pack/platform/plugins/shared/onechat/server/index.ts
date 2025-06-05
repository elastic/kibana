/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { OnechatConfig } from './config';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { OnechatPlugin } from './plugin';

export type { OnechatPluginSetup, OnechatPluginStart, ToolsSetup, ToolsStart } from './types';
export type { ScopedPublicToolRegistry, ScopedPublicToolRegistryFactoryFn } from './services/tools';

export const plugin: PluginInitializer<
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<OnechatConfig>) => {
  return new OnechatPlugin(pluginInitializerContext);
};

export { config } from './config';
