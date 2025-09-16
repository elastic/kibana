/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RunAgentFn, RunToolFn } from '@kbn/onechat-server';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentClient } from './services/agents';
import type { ToolRegistry, ToolsServiceSetup } from './services/tools';

export interface OnechatSetupDependencies {
  inference: InferenceServerSetup;
  cloud?: CloudSetup;
  features: FeaturesPluginSetup;
  workflowsManagement?: WorkflowsPluginSetup;
}

export interface OnechatStartDependencies {
  inference: InferenceServerStart;
  cloud?: CloudStart;
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
