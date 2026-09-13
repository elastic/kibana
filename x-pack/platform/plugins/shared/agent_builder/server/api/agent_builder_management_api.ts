/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  AgentCreateRequest,
  AgentUpdateRequest,
  PersistedSkillCreateRequest,
} from '@kbn/agent-builder-common';
import { skillIndexName } from '../services/skills/persisted/client/storage';

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
    const [, , pluginStart] = await this.getStartServices();
    if (!pluginStart?.agents) {
      throw new Error('agentBuilder plugin is not available');
    }
    return pluginStart.agents;
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
        // AB-004: carry the managed flag on upgrades too, otherwise a reinstall
        // silently downgrades a package agent to an editable user agent.
        readonly: params.readonly,
        avatar_color: params.avatar_color,
        avatar_symbol: params.avatar_symbol,
        configuration: params.configuration,
      };
      return registry.update(params.id, update);
    }

    return registry.create(params); // AB-004: params may carry readonly=true (fleet package agent)
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

  /**
   * AB-005: create or update a package-managed persisted skill
   * (system context; plugin_id makes it readonly in the UI).
   */
  public async createOrUpdateSkill(params: PersistedSkillCreateRequest, request: KibanaRequest) {
    const [, , pluginStart] = await this.getStartServices();
    if (!pluginStart?.skills) {
      throw new Error('agentBuilder skills service is not available');
    }
    // Use the caller request: the skills registry runs an ES privilege check,
    // which fails with a synthetic credential-less request.
    const registry = await pluginStart.skills.getRegistry({ request });
    if (!(await registry.has(params.id))) {
      return registry.create(params);
    }
    // The registry blocks direct updates of plugin-managed skills (a guard meant for
    // end users). Package reinstall/upgrade must still refresh its own skill, so write
    // the document through the internal client instead.
    const [coreStart] = await this.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const existing = await esClient.search<Record<string, unknown>>({
      index: skillIndexName,
      query: { term: { id: params.id } },
      size: 1,
    });
    const hit = existing.hits.hits[0];
    if (!hit?._id) {
      return registry.create(params);
    }
    const updatedDocument = {
      ...(hit._source ?? {}),
      name: params.name,
      description: params.description,
      content: params.content,
      tool_ids: params.tool_ids,
      updated_at: new Date().toISOString(),
    };
    await esClient.index({ index: skillIndexName, id: hit._id, document: updatedDocument, refresh: true });
    return registry.get(params.id);
  }

  /**
   * AB-005: system-level delete for Fleet package uninstall.
   * The user-context registry blocks deletes of plugin-managed skills,
   * so bypass it with an internal ES query by id + space.
   */
  public async deletePackageManagedSkill(skillId: string, spaceId: string): Promise<boolean> {
    const [coreStart] = await this.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    try {
      const searchResult = await esClient.search<{ id: string; space: string }>({
        index: skillIndexName,
        query: {
          bool: {
            filter: [{ term: { id: skillId } }, { term: { space: spaceId } }],
          },
        },
        size: 1,
      });
      const documentId = searchResult.hits.hits[0]?._id;
      if (!documentId) {
        return false;
      }
      const deleteResponse = await esClient.delete({ index: skillIndexName, id: documentId });
      return deleteResponse.result === 'deleted';
    } catch (error) {
      this.logger.warn(
        `Failed to delete package-managed skill ${skillId} in space ${spaceId}: ${
          (error as Error).message
        }`
      );
      return false;
    }
  }

  /**
   * AB-005: list the skills owned by a Fleet package in a space.
   *
   * Package-managed skills are readonly, so neither the user nor package
   * uninstall can remove one whose id is absent from the package asset refs.
   * Install uses this to reap its own stale skills; it reads through the
   * internal client because the user-context registry hides plugin-managed
   * skills by default.
   */
  public async listPackageManagedSkills(
    pluginId: string,
    spaceId: string
  ): Promise<Array<{ id: string; plugin_id?: string }>> {
    const [coreStart] = await this.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    try {
      const searchResult = await esClient.search<{ id: string; plugin_id?: string }>({
        index: skillIndexName,
        query: {
          bool: {
            filter: [{ term: { plugin_id: pluginId } }, { term: { space: spaceId } }],
          },
        },
        size: 1000,
      });
      return searchResult.hits.hits
        .map((hit) => hit._source)
        .filter((source): source is { id: string; plugin_id?: string } => Boolean(source?.id));
    } catch (error) {
      this.logger.warn(
        `Failed to list package-managed skills for ${pluginId} in space ${spaceId}: ${
          (error as Error).message
        }`
      );
      return [];
    }
  }
}
