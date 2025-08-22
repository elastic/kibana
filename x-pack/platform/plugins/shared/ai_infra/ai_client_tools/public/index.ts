/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { AIClientToolsBasePlugin } from './plugin';
import type {
  AIClientToolsBasePluginSetup,
  AIClientToolsBasePluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
  PublicPluginConfig,
} from './types';

export type { AIClientToolsBasePluginSetup, AIClientToolsBasePluginStart };
export { usePostToolClientActions } from '../common/hooks/use_post_actions';
export { addToDashboardTool } from './nl_to_dashboard/client_side_tool';
export {
  convertSchemaToObservabilityParameters,
  convertParametersToSchema,
} from '../common/schema_adapters';
export type { OneChatToolWithClientCallback } from '../common/types';
export const plugin: PluginInitializer<
  AIClientToolsBasePluginSetup,
  AIClientToolsBasePluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<PublicPluginConfig>) =>
  new AIClientToolsBasePlugin(pluginInitializerContext);
