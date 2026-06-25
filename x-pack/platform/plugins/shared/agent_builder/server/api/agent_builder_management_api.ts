/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentCreateRequest, AgentUpdateRequest } from '@kbn/agent-builder-common';
import { agentsIndexName } from '../services/agents/persisted/client/storage';
import type { AgentBuilderPluginStart, AgentBuilderStartDependencies } from '../types';

export class AgentBuilderManagementApi {
  constructor(
    private readonly getStartServices: CoreSetup<
      AgentBuilderStartDependencies,
      AgentBuilderPluginStart
    >['getStartServices'],
    private readonly logger: Logger
  ) {}

  private async getAgentsService() {
    const [, startDeps] = await this.getStartServices();
    if (!startDeps.agentBuilder) {
      throw new Error('agentBuilder plugin is not available');
    }
    return startDeps.agentBuilder.agents;
  }

  public async getAgent(agentId: string, request: KibanaRequest) {
    const agents = await this.getAgentsService();
    const registry = await agents.getRegistry({ request });
    if (!(await registry.has(agentId))) {
      return null;
    }
    return registry.get(agentId);
  }

  public async createOrUpdateAgent(params: AgentCreateRequest, request: KibanaRequest) {
    const agents = await this.getAgentsService();
    const registry = await agents.getRegistry({ request });

    if (await registry.has(params.id)) {
      const update: AgentUpdateRequest = {
        name: params.name,
        description: params.description,
        labels: params.labels,
        avatar_color: params.avatar_color,
        avatar_symbol: params.avatar_symbol,
        configuration: params.configuration,
      };
      return registry.update(params.id, update);
    }

    return registry.create(params);
  }

  public async deleteAgent(agentId: string, request: KibanaRequest): Promise<boolean> {
    const agents = await this.getAgentsService();
    const registry = await agents.getRegistry({ request });
    return registry.delete({ id: agentId });
  }

  /**
   * System-level delete for Fleet package uninstall (no end-user request context).
   */
  public async deletePackageManagedAgent(agentId: string, spaceId: string): Promise<boolean> {
    const [coreStart] = await this.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    try {
      const searchResult = await esClient.search<{ id: string; space: string }>({
        index: agentsIndexName,
        query: {
          bool: {
            filter: [{ term: { id: agentId } }, { term: { space: spaceId } }],
          },
        },
        size: 1,
      });

      const documentId = searchResult.hits.hits[0]?._id;
      if (!documentId) {
        return false;
      }

      const deleteResponse = await esClient.delete({
        index: agentsIndexName,
        id: documentId,
      });
      return deleteResponse.result === 'deleted';
    } catch (error) {
      this.logger.warn(
        `Failed to delete package-managed agent ${agentId} in space ${spaceId}: ${
          (error as Error).message
        }`
      );
      return false;
    }
  }
}
