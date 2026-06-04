/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentAcl } from '@kbn/agent-builder-common';
import type {
  AgentAclUpdateRequest,
  AgentCreateRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../common/agents';
import type { InternalAgentDefinition } from './agent_registry';

export type AgentAccess = 'read' | 'use' | 'write' | 'delete' | 'manageAcl';

export interface GetAgentOptions {
  access?: AgentAccess;
}

export interface AgentAclResult {
  can_manage: boolean;
  acl: AgentAcl;
}

export interface ReadonlyAgentProvider {
  id: string;
  readonly: true;
  has(agentId: string): MaybePromise<boolean>;
  get(agentId: string, opts?: GetAgentOptions): MaybePromise<InternalAgentDefinition>;
  list(opts: AgentListOptions): MaybePromise<InternalAgentDefinition[]>;
}

export interface WritableAgentProvider extends Omit<ReadonlyAgentProvider, 'readonly'> {
  readonly: false;
  create(createRequest: AgentCreateRequest): MaybePromise<InternalAgentDefinition>;
  update(agentId: string, update: AgentUpdateRequest): MaybePromise<InternalAgentDefinition>;
  delete(agentId: string): MaybePromise<boolean>;
  getAcl(agentId: string): MaybePromise<AgentAclResult>;
  updateAcl(agentId: string, update: AgentAclUpdateRequest): MaybePromise<AgentAcl>;
}

export type AgentProvider = ReadonlyAgentProvider | WritableAgentProvider;

export type AgentProviderFn<ReadOnly extends boolean> = (opts: {
  space: string;
  request: KibanaRequest;
}) => MaybePromise<ReadOnly extends true ? ReadonlyAgentProvider : WritableAgentProvider>;

export const isWritableProvider = (provider: AgentProvider): provider is WritableAgentProvider => {
  return !provider.readonly;
};

export const isReadonlyProvider = (provider: AgentProvider): provider is ReadonlyAgentProvider => {
  return provider.readonly;
};
