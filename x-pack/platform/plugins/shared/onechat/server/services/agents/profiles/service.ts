/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentProfile } from '@kbn/onechat-common';
import { createBadRequestError } from '@kbn/onechat-common/base/errors';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  AgentProfileCreateRequest,
  AgentProfileUpdateRequest,
  AgentProfileListOptions,
  AgentProfileDeleteRequest,
} from '../../../../common/agent_profiles';
import type { AgentProfileClient } from './client';
import type { ToolsServiceStart } from '../../tools';

export interface AgentProfileService {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<AgentProfile>;
  create(profile: AgentProfileCreateRequest): Promise<AgentProfile>;
  update(profile: AgentProfileUpdateRequest): Promise<AgentProfile>;
  list(options?: AgentProfileListOptions): Promise<AgentProfile[]>;
  delete(options: AgentProfileDeleteRequest): Promise<boolean>;
}

export interface AgentProfileServiceOptions {
  client: AgentProfileClient;
  toolsService: ToolsServiceStart;
  logger: Logger;
  request: KibanaRequest;
}

export const createAgentProfileService = (
  options: AgentProfileServiceOptions
): AgentProfileService => {
  return new AgentProfileServiceImpl(options);
};

class AgentProfileServiceImpl implements AgentProfileService {
  private readonly client: AgentProfileClient;
  private readonly toolsService: ToolsServiceStart;
  private readonly logger: Logger;
  private readonly request: KibanaRequest;

  constructor({ client, toolsService, logger, request }: AgentProfileServiceOptions) {
    this.client = client;
    this.toolsService = toolsService;
    this.logger = logger;
    this.request = request;
  }

  async has(agentId: string): Promise<boolean> {
    return this.client.has(agentId);
  }

  async get(agentId: string): Promise<AgentProfile> {
    return this.client.get(agentId);
  }

  async create(profile: AgentProfileCreateRequest): Promise<AgentProfile> {
    this.logger.debug('Creating agent profile');
    await this.validateToolSelection(profile.toolSelection);
    return this.client.create(profile);
  }

  async update(profile: AgentProfileUpdateRequest): Promise<AgentProfile> {
    this.logger.debug('Updating agent profile');
    if (profile.toolSelection) {
      await this.validateToolSelection(profile.toolSelection);
    }
    return this.client.update(profile);
  }

  private async validateToolSelection(toolSelection: AgentProfileCreateRequest['toolSelection']) {
    const registry = this.toolsService.registry;
    const allTools = await registry.list({ request: this.request });
    const allProviders = new Set(allTools.map((t: any) => t.meta.providerId));

    for (const selection of toolSelection) {
      const { provider, toolIds } = selection;
      if (!provider) {
        // If provider is not specified, check for ambiguity
        for (const toolId of toolIds) {
          if (toolId === '*') continue;
          const matchingTools = allTools.filter((t: any) => t.id === toolId);
          if (matchingTools.length > 1) {
            const matchingProviders = Array.from(
              new Set(matchingTools.map((t: any) => t.meta.providerId))
            );
            throw createBadRequestError(
              `Tool id '${toolId}' is ambiguous. Please specify a provider. Matching providers: [${matchingProviders.join(
                ', '
              )}]`
            );
          }
          if (matchingTools.length === 0) {
            throw createBadRequestError(`Tool id '${toolId}' does not exist in any provider.`);
          }
        }
      } else {
        // Provider specified
        if (!allProviders.has(provider)) {
          throw createBadRequestError(`Provider '${provider}' does not exist or has no tools.`);
        }
        if (toolIds.length === 1 && toolIds[0] === '*') {
          // Check provider has at least one tool
          const providerTools = allTools.filter((t: any) => t.meta.providerId === provider);
          if (providerTools.length === 0) {
            throw createBadRequestError(`Provider '${provider}' does not have any tools.`);
          }
        } else {
          // Check each tool exists for the provider using registry.has for efficiency
          for (const toolId of toolIds) {
            const exists = await registry.has({
              toolId: { toolId, providerId: provider },
              request: this.request,
            });
            if (!exists) {
              throw createBadRequestError(
                `Tool id '${toolId}' does not exist for provider '${provider}'.`
              );
            }
          }
        }
      }
    }
  }

  async list(options?: AgentProfileListOptions): Promise<AgentProfile[]> {
    return this.client.list(options);
  }

  async delete(options: AgentProfileDeleteRequest): Promise<boolean> {
    return this.client.delete(options);
  }
}
