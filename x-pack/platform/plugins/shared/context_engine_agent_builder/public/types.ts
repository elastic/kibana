/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineAgentBuilderPublicSetupDependencies {}

export interface ContextEngineAgentBuilderPublicStartDependencies {
  contextEngine: ContextEnginePluginStart;
  agentBuilder: AgentBuilderPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineAgentBuilderPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineAgentBuilderPublicStart {}
