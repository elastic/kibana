/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RunToolFn, ScopedRunToolFn, RunAgentFn, ToolProvider } from '@kbn/onechat-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  PluginStartContract as ActionsPluginStart,
  PluginSetupContract as ActionsPluginSetup,
} from '@kbn/actions-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ToolsServiceSetup, ScopedPublicToolRegistry } from './services/tools';
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
  /**
   * Register a tool provider to be available in onechat.
   */
  registerProvider: ToolsServiceSetup['registerProvider'];
}

/**
 * Onechat tool service's start contract
 */
export interface ToolsStart {
  /**
   * Access the tool registry's APIs.
   */
  registry: ToolProvider;
  /**
   * Execute a tool.
   */
  execute: RunToolFn;
  /**
   * Return a version of the tool APIs scoped to the provided request.
   */
  asScoped: (opts: { request: KibanaRequest }) => ScopedToolsStart;
}

/**
 * Scoped tools APIs.
 */
export interface ScopedToolsStart {
  /**
   * scoped tools registry
   */
  registry: ScopedPublicToolRegistry;
  /**
   * Scoped tool runner
   */
  execute: ScopedRunToolFn;
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
