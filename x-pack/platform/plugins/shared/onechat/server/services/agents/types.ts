/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  AgentProvider,
  AgentRegistry,
  AgentDefinition,
  RunAgentFn,
} from '@kbn/onechat-server';

import type { AgentProfileService } from './profiles';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentsServiceSetup {}

export interface AgentsServiceStart {
  registry: InternalAgentRegistry;
  execute: RunAgentFn;
  getProfileService: (request: KibanaRequest) => Promise<AgentProfileService>;
}

export type AgentProviderWithId = AgentProvider & {
  id: string;
};

export type AgentDefinitionWithProviderId = AgentDefinition & {
  providerId: string;
};

export type AgentWithIdProvider = AgentProvider<AgentDefinitionWithProviderId>;

export type InternalAgentRegistry = AgentWithIdProvider & {
  asPublicRegistry: () => AgentRegistry;
};
