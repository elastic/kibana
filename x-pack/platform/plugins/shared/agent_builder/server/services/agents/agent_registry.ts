/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import { createAgentNotFoundError, createBadRequestError } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { validateAgentId } from '@kbn/agent-builder-common/agents';
import type {
  AgentAvailabilityContext,
  AgentAvailabilityResult,
} from '@kbn/agent-builder-server/agents';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type {
  AgentCreateRequest,
  AgentListOptions,
  AgentDeleteRequest,
  AgentUpdateRequest,
} from '../../../common/agents';
import type { WritableAgentProvider, ReadonlyAgentProvider } from './agent_source';
import { isReadonlyProvider } from './agent_source';

// internal definition for our agents
export type InternalAgentDefinition = AgentDefinition & {
  isAvailable: InternalAgentDefinitionAvailabilityHandler;
};

export type InternalAgentDefinitionAvailabilityHandler = (
  ctx: AgentAvailabilityContext
) => MaybePromise<AgentAvailabilityResult>;

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
  spaceId: string;
  persistedProvider: WritableAgentProvider;
  builtinProvider: ReadonlyAgentProvider;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
}

export const createAgentRegistry = (opts: CreateAgentRegistryOpts): AgentRegistry => {
  return new AgentRegistryImpl(opts);
};

class AgentRegistryImpl implements AgentRegistry {
  private readonly request: KibanaRequest;
  private readonly spaceId: string;
  private readonly persistedProvider: WritableAgentProvider;
  private readonly builtinProvider: ReadonlyAgentProvider;
  private readonly uiSettings: UiSettingsServiceStart;
  private readonly savedObjects: SavedObjectsServiceStart;

  constructor({
    request,
    spaceId,
    persistedProvider,
    builtinProvider,
    uiSettings,
    savedObjects,
  }: CreateAgentRegistryOpts) {
    this.request = request;
    this.spaceId = spaceId;
    this.persistedProvider = persistedProvider;
    this.builtinProvider = builtinProvider;
    this.uiSettings = uiSettings;
    this.savedObjects = savedObjects;
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
        const agent = await provider.get(agentId);
        if (!(await this.isAvailable(agent))) {
          throw createBadRequestError(`Agent ${agentId} is not available`);
        }
        return agent;
      }
    }
    throw createAgentNotFoundError({ agentId });
  }

  async list(opts: AgentListOptions): Promise<InternalAgentDefinition[]> {
    const allAgents: InternalAgentDefinition[] = [];
    for (const provider of this.orderedProviders) {
      const providerAgents = await provider.list(opts);
      for (const agent of providerAgents) {
        if (await this.isAvailable(agent)) {
          allAgents.push(agent);
        }
      }
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

  private async isAvailable(agent: InternalAgentDefinition): Promise<boolean> {
    const soClient = this.savedObjects.getScopedClient(this.request);
    const uiSettingsClient = this.uiSettings.asScopedToClient(soClient);

    const context: AgentAvailabilityContext = {
      spaceId: this.spaceId,
      request: this.request,
      uiSettings: uiSettingsClient,
    };

    const status = await agent.isAvailable(context);
    return status.status === 'available';
  }
}
