/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
  ConfigSchema,
} from './types';
import { AgentBuilderPlugin } from './plugin';
import { RobotIcon } from './application/components/common/icons/robot';
import { AGENTBUILDER_FEATURE_ID } from '../common/features';

export type { AgentBuilderPluginSetup, AgentBuilderPluginStart };
export { RobotIcon as agentBuilderIconType };
export { AGENTBUILDER_FEATURE_ID };
export const plugin: PluginInitializer<
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) => {
  return new AgentBuilderPlugin(pluginInitializerContext);
};
