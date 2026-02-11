/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-plugin/server/types';
import type {
  StreamsPluginSetup,
  StreamsPluginStart,
} from '@kbn/streams-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsAgentPluginSetup {}

export type StreamsAgentPluginStart = Record<string, never>;

export interface StreamsAgentPluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  streams: StreamsPluginSetup;
}

export interface StreamsAgentPluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  streams: StreamsPluginStart;
}

export type StreamsAgentCoreSetup = CoreSetup<
  StreamsAgentPluginStartDependencies,
  StreamsAgentPluginStart
>;
