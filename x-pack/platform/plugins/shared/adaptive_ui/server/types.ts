/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  actions: ActionsPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  actions: ActionsPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AdaptiveUiPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AdaptiveUiPluginStart {}
