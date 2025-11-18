/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { createAgentNotFoundError, createBadRequestError } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { validateAgentId } from '@kbn/agent-builder-common/agents';
import type {
  AgentCreateRequest,
  AgentListOptions,
  AgentDeleteRequest,
  AgentUpdateRequest,
} from '../../../common/agents';
import type { WritableAgentProvider, ReadonlyAgentProvider } from './agent_source';
import { isReadonlyProvider } from './agent_source';

// for now it's the same
export type InternalAgentDefinition = AgentDefinition;

export interface AgentRegistry {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<InternalAgentDefinition>;
  list(opts?: AgentListOptions): Promise<InternalAgentDefinition[]>;
  create(createRequest: AgentCreateRequest): Promise<InternalAgentDefinition>;
  update(agentId: string, update: AgentUpdateRequest): Promise<InternalAgentDefinition>;
  delete(args: AgentDeleteRequest): Promise<boolean>;
}

interface CreateAgentRegistryOpts {
  request: KibanaRequest;
  space: string;
  persistedProvider: WritableAgentProvider;
  builtinProvider: ReadonlyAgentProvider;
}

export const createAgentRegistry = (opts: CreateAgentRegistryOpts): AgentRegistry => {
  return new AgentRegistryImpl(opts);
};

class AgentRegistryImpl implements AgentRegistry {
  private readonly persistedProvider: WritableAgentProvider;
  private readonly builtinProvider: ReadonlyAgentProvider;

  constructor({ persistedProvider, builtinProvider }: CreateAgentRegistryOpts) {
    this.persistedProvider = persistedProvider;
    this.builtinProvider = builtinProvider;
  }

  private get orderedProviders() {
    return [this.builtinProvider, this.persistedProvider];
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
