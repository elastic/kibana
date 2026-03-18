/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';

export interface LlmGatewaySetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
}

export interface LlmGatewayStartDependencies {
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
  agentBuilder: AgentBuilderPluginStart;
}

export type LlmGatewayPluginSetup = Record<string, never>;

export type LlmGatewayPluginStart = Record<string, never>;
