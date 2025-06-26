/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core-plugins-browser';
import {
  AiAssistantManagementObservabilityPlugin,
  AiAssistantManagementObservabilityPluginSetup,
  AiAssistantManagementObservabilityPluginStart,
  ConfigSchema,
  SetupDependencies,
  StartDependencies,
} from './plugin';

export type {
  AiAssistantManagementObservabilityPluginSetup,
  AiAssistantManagementObservabilityPluginStart,
} from './plugin';

export const plugin: PluginInitializer<
  AiAssistantManagementObservabilityPluginSetup,
  AiAssistantManagementObservabilityPluginStart,
  SetupDependencies,
  StartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) => {
  return new AiAssistantManagementObservabilityPlugin(pluginInitializerContext);
};
