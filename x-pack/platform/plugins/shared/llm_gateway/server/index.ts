/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { LlmGatewayConfig } from './config';
import type {
  LlmGatewayPluginSetup,
  LlmGatewayPluginStart,
  LlmGatewaySetupDependencies,
  LlmGatewayStartDependencies,
} from './types';
import { LlmGatewayPlugin } from './plugin';

export const plugin: PluginInitializer<
  LlmGatewayPluginSetup,
  LlmGatewayPluginStart,
  LlmGatewaySetupDependencies,
  LlmGatewayStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<LlmGatewayConfig>) => {
  return new LlmGatewayPlugin(pluginInitializerContext);
};

export { config } from './config';
