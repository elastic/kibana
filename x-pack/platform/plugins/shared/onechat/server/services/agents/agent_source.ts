/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  AgentCreateRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../common/agents';
import type { InternalAgentDefinition } from './agent_registry';

export interface ReadonlyAgentProvider {
  id: string;
  readonly: true;
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<InternalAgentDefinition>;
  list(opts: AgentListOptions): Promise<InternalAgentDefinition[]>;
}

export interface WritableAgentProvider extends Omit<ReadonlyAgentProvider, 'readonly'> {
  readonly: false;
  create(createRequest: AgentCreateRequest): Promise<InternalAgentDefinition>;
  update(agentId: string, update: AgentUpdateRequest): Promise<InternalAgentDefinition>;
  delete(agentId: string): Promise<boolean>;
}

export type AgentProvider = ReadonlyAgentProvider | WritableAgentProvider;

export type AgentProviderFn = (opts: { request: KibanaRequest }) => MaybePromise<AgentProvider>;

export const isWritableProvider = (provider: AgentProvider): provider is WritableAgentProvider => {
  return !provider.readonly;
};

export const isReadonlyProvider = (provider: AgentProvider): provider is ReadonlyAgentProvider => {
  return provider.readonly;
};
