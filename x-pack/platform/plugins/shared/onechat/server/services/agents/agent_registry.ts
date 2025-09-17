/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import {
  createAgentNotFoundError,
  createBadRequestError,
  createInternalError,
} from '@kbn/onechat-common';
import type { AgentDefinition } from '@kbn/onechat-common/agents';
import { validateAgentId } from '@kbn/onechat-common/agents';
import type {
  AgentCreateRequest,
  AgentListOptions,
  AgentDeleteRequest,
  AgentUpdateRequest,
} from '../../../common/agents';
import type { AgentClient } from './client';
import type { BuiltinAgentRegistry } from './builtin';
import {
  WritableAgentProvider,
  ReadonlyAgentProvider,
  AgentProvider,
  isReadonlyProvider,
} from './agent_source';

// for now it's the same
export type InternalAgentDefinition = AgentDefinition;

export interface AgentRegistry {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<InternalAgentDefinition>;
  list(opts?: AgentListOptions): Promise<InternalAgentDefinition[]>;
  create(createRequest: AgentCreateRequest): Promise<InternalAgentDefinition>;
  update(agentId: string, update: AgentUpdateRequest): Promise<InternalAgentDefinition>;
  delete(args: AgentDeleteRequest): Promise<boolean>;

  /*
  execute<TParams extends object = Record<string, unknown>>(
    params: ScopedRunnerRunToolsParams<TParams>
  ): Promise<RunToolReturn>;
  */
}

interface CreateAgentRegistryOpts {
  request: KibanaRequest;
  persistedProvider: WritableAgentProvider;
  builtinProvider: ReadonlyAgentProvider;
}

export const createAgentRegistry = (opts: CreateAgentRegistryOpts): AgentRegistry => {
  return new AgentRegistryImpl(opts);
};

class AgentRegistryImpl implements AgentRegistry {
  private request: KibanaRequest;
  private persistedProvider: WritableAgentProvider;
  private builtinProvider: ReadonlyAgentProvider;
  private orderedProviders: AgentProvider[];

  constructor({ persistedProvider, builtinProvider, request }: CreateAgentRegistryOpts) {
    this.request = request;
    this.persistedProvider = persistedProvider;
    this.builtinProvider = builtinProvider;
    this.orderedProviders = [builtinProvider, persistedProvider];
  }

  async has(agentId: string): Promise<boolean> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(agentId)) {
        return true;
      }
    }
    return false;
  }

  async get(agentId: string): Promise<InternalAgentDefinition> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(agentId)) {
        return provider.get(agentId);
      }
    }
    throw createAgentNotFoundError({ agentId });
  }

  async list(opts: AgentListOptions): Promise<InternalAgentDefinition[]> {
    const allAgents: InternalAgentDefinition[] = [];
    for (const provider of this.orderedProviders) {
      const providerAgents = await provider.list(opts);
      allAgents.push(...providerAgents);
    }
    return allAgents;
  }

  async create(createRequest: AgentCreateRequest): Promise<InternalAgentDefinition> {
    const { id: agentId } = createRequest;

    const validationError = validateAgentId({ agentId, builtIn: false });
    if (validationError) {
      throw createBadRequestError(`Invalid agent id: "${agentId}": ${validationError}`);
    }

    if (await this.has(agentId)) {
      throw createBadRequestError(`Agent with id ${agentId} already exists`);
    }

    return this.persistedProvider.create(createRequest);
  }

  async update(agentId: string, update: AgentUpdateRequest): Promise<InternalAgentDefinition> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(agentId)) {
        if (isReadonlyProvider(provider)) {
          throw createBadRequestError(`Agent ${agentId} is read-only and can't be updated`);
        } else {
          return provider.update(agentId, update);
        }
      }
    }
    throw createAgentNotFoundError({ agentId });
  }

  async delete({ id: agentId }: AgentDeleteRequest): Promise<boolean> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(agentId)) {
        if (isReadonlyProvider(provider)) {
          throw createBadRequestError(`Agent ${agentId} is read-only and can't be deleted`);
        } else {
          return provider.delete(agentId);
        }
      }
    }
    throw createAgentNotFoundError({ agentId });
  }
}
