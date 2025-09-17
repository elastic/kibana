/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RunToolFn } from '@kbn/onechat-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { CloudStart, CloudSetup } from '@kbn/cloud-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ToolsServiceSetup, ToolRegistry } from './services/tools';
import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

export interface OnechatSetupDependencies {
  inference: InferenceServerSetup;
  cloud?: CloudSetup;
  features: FeaturesPluginSetup;
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
   * Return a tool registry scoped to the current user and context.
   */
  getRegistry: (opts: { request: KibanaRequest }) => Promise<ToolRegistry>;
}

export interface AgentsSetup {
  /**
   * Register a built-in agent to be available in onechat.
   */
  register: (definition: BuiltInAgentDefinition) => void;
}

/**
 * Setup contract of the onechat plugin.
 */
export interface OnechatPluginSetup {
  /**
   * Agents setup contract, can be used to register built-in agents.
   */
  agents: AgentsSetup;
  /**
   * Tools setup contract, can be used to register built-in tools.
   */
  tools: ToolsSetup;
}

/**
 * Start contract of the onechat plugin.
 */
export interface OnechatPluginStart {
  /**
   * Tools service, to manage or execute tools.
   */
  tools: ToolsStart;
}
