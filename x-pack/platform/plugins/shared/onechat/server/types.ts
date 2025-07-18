/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RunToolFn, RunAgentFn } from '@kbn/onechat-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  PluginStartContract as ActionsPluginStart,
  PluginSetupContract as ActionsPluginSetup,
} from '@kbn/actions-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ToolsServiceSetup, ToolRegistry } from './services/tools';
import type { AgentClient } from './services/agents';

export interface OnechatSetupDependencies {
  actions: ActionsPluginSetup;
  inference: InferenceServerSetup;
  features: FeaturesPluginSetup;
}

export interface OnechatStartDependencies {
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
}

/**
 * Onechat tool service's setup contract
 */
export interface ToolsSetup {
  /**
   * Register a built-in tool to be available in onechat.
   */
  register: ToolsServiceSetup['register'];
}

/**
 * Onechat tool service's start contract
 */
export interface ToolsStart {
  /**
   * Execute a tool.
   */
  execute: RunToolFn;
  /**
   * Return the global tool registry scoped to the current user.
   */
  getRegistry: (opts: { request: KibanaRequest }) => Promise<ToolRegistry>;
}

export interface AgentsStart {
  /**
   * Returns a scoped agent client
   */
  getScopedClient(opts: { request: KibanaRequest }): Promise<AgentClient>;
  /**
   * Execute an agent.
   */
  execute: RunAgentFn;
}

/**
 * Setup contract of the onechat plugin.
 */
export interface OnechatPluginSetup {
  tools: ToolsSetup;
}

/**
 * Start contract of the onechat plugin.
 */
export interface OnechatPluginStart {
  tools: ToolsStart;
  agents: AgentsStart;
}
