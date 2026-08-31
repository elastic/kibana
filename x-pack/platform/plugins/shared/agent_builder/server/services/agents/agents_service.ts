/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  SecurityServiceStart,
  ElasticsearchServiceStart,
  KibanaRequest,
  UiSettingsServiceStart,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { isAllowedBuiltinAgent } from '@kbn/agent-builder-server/allow_lists';
import type {
  AgentAvailabilityConfig,
  AgentTypeRegistry,
  AiIndexResolver,
} from '@kbn/agent-builder-server/agents';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { defaultAiIndices } from './default_ai_indices';
import { createConfigurationResolver } from './resolve_configuration';
import { getCurrentSpaceId } from '../../utils/spaces';
import type {
  AgentsServiceSetup,
  AgentsServiceStart,
  PluginRefsParams,
  SkillRefsParams,
  ToolRefsParams,
} from './types';
import type { AgentsUsingSkillsResult, AgentsUsingToolsResult } from './persisted/types';
import type { ToolsServiceStart } from '../tools';
import {
  createBuiltinAgentRegistry,
  createBuiltinProviderFn,
  type BuiltinAgentRegistry,
} from './builtin';
import { createPersistedProviderFn } from './persisted';
import { createAgentRegistry } from './agent_registry';
import { createAgentTypeRegistry } from './types/registry';
import { createClient, createSystemClient } from './persisted/client';

export interface AgentsServiceSetupDeps {
  logger: Logger;
}

export interface AgentsServiceStartDeps {
  security: SecurityServiceStart;
  spaces?: SpacesPluginStart;
  elasticsearch: ElasticsearchServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  toolsService: ToolsServiceStart;
}

export class AgentsService {
  private builtinRegistry: BuiltinAgentRegistry;
  private typeRegistry: AgentTypeRegistry;
  /** In-memory availability for persisted agents, keyed by agent id. Filled by `ensure`. */
  private readonly availabilityByAgentId = new Map<string, AgentAvailabilityConfig>();
  private aiIndexResolver?: AiIndexResolver;

  private setupDeps?: AgentsServiceSetupDeps;

  constructor() {
    this.builtinRegistry = createBuiltinAgentRegistry();
    this.typeRegistry = createAgentTypeRegistry();
  }

  setup(setupDeps: AgentsServiceSetupDeps): AgentsServiceSetup {
    this.setupDeps = setupDeps;

    this.typeRegistry.register({
      id: chatAgentTypeId,
      baseConfiguration: { ai_indices: Object.keys(defaultAiIndices) },
    });

    return {
      register: (agent) => {
        if (!isAllowedBuiltinAgent(agent.id)) {
          throw new Error(`Built-in agent with id "${agent.id}" is not in the list of allowed built-in agents.
             Please add it to the list of allowed built-in agents in the "@kbn/agent-builder-server/allow_lists.ts" file.`);
        }
        this.builtinRegistry.register(agent);
      },
      registerType: (type) => {
        this.typeRegistry.register(type);
      },
      registerAiIndexResolver: (resolver) => {
        if (this.aiIndexResolver) {
          throw new Error('An AI index resolver is already registered');
        }
        this.aiIndexResolver = resolver;
      },
    };
  }

  private validateAgentTypes() {
    for (const agent of this.builtinRegistry.list()) {
      if (agent.type !== undefined && !this.typeRegistry.has(agent.type)) {
        throw new Error(
          `Built-in agent with id "${agent.id}" references unknown agent type "${agent.type}". Register the type via agents.registerType().`
        );
      }
    }
  }

  start(startDeps: AgentsServiceStartDeps): AgentsServiceStart {
    if (!this.setupDeps) {
      throw new Error('#start called before #setup');
    }

    const { logger } = this.setupDeps;
    const { security, elasticsearch, spaces, toolsService, uiSettings, savedObjects } = startDeps;

    this.validateAgentTypes();

    const configurationResolver = createConfigurationResolver({
      typeRegistry: this.typeRegistry,
      logger,
    });

    const builtinProviderFn = createBuiltinProviderFn({ registry: this.builtinRegistry });
    const persistedProviderFn = createPersistedProviderFn({
      elasticsearch,
      security,
      toolsService,
      logger,
      availabilityByAgentId: this.availabilityByAgentId,
    });

    const getAgentClient = async ({ request }: { request: KibanaRequest }) => {
      const space = getCurrentSpaceId({ request, spaces });
      return createClient({
        elasticsearch,
        logger,
        request,
        security,
        space,
        toolsService,
      });
    };

    const getRegistry = async ({ request }: { request: KibanaRequest }) => {
      const space = getCurrentSpaceId({ request, spaces });
      return createAgentRegistry({
        request,
        spaceId: space,
        uiSettings,
        savedObjects,
        typeRegistry: this.typeRegistry,
        builtinProvider: await builtinProviderFn({ request, space }),
        persistedProvider: await persistedProviderFn({ request, space }),
      });
    };

    const ensure: AgentsServiceStart['ensure'] = async ({ spaceId, agent, availability }) => {
      if (this.builtinRegistry.has(agent.id)) {
        throw new Error(
          `Cannot ensure persisted agent "${agent.id}": a built-in agent uses this id`
        );
      }
      if (agent.type !== undefined && !this.typeRegistry.has(agent.type)) {
        throw new Error(`Cannot ensure agent "${agent.id}": unknown agent type "${agent.type}"`);
      }

      if (availability) {
        this.availabilityByAgentId.set(agent.id, availability);
      }

      const systemClient = createSystemClient({ space: spaceId, elasticsearch, logger });
      await systemClient.ensureAgent(agent);
    };

    const resolveAgentConfiguration: AgentsServiceStart['resolveAgentConfiguration'] = ({
      agent,
      request,
    }) => {
      const spaceId = getCurrentSpaceId({ request, spaces });
      return configurationResolver.resolveConfig({
        agentType: agent.type,
        configuration: agent.configuration,
        ctx: { request, spaceId },
      });
    };

    const resolveAgentBaseConfiguration: AgentsServiceStart['resolveAgentBaseConfiguration'] = ({
      agentType,
      request,
    }) => {
      const spaceId = getCurrentSpaceId({ request, spaces });
      return configurationResolver.resolveBase(agentType, { request, spaceId });
    };

    const removeToolRefsFromAgents = async ({
      request,
      toolIds,
    }: ToolRefsParams): Promise<AgentsUsingToolsResult> => {
      const client = await getAgentClient({ request });
      return client.removeToolRefsFromAgents({ toolIds });
    };

    const getAgentsUsingTools = async ({
      request,
      toolIds,
    }: ToolRefsParams): Promise<AgentsUsingToolsResult> => {
      const client = await getAgentClient({ request });
      return client.getAgentsUsingTools({ toolIds });
    };

    const removePluginRefsFromAgents = async ({
      request,
      pluginIds,
    }: PluginRefsParams): Promise<AgentsUsingToolsResult> => {
      const client = await getAgentClient({ request });
      return client.removePluginRefsFromAgents({ pluginIds });
    };

    const getAgentsUsingPlugins = async ({
      request,
      pluginIds,
    }: PluginRefsParams): Promise<AgentsUsingToolsResult> => {
      const client = await getAgentClient({ request });
      return client.getAgentsUsingPlugins({ pluginIds });
    };

    const removeSkillRefsFromAgents = async ({
      request,
      skillIds,
    }: SkillRefsParams): Promise<AgentsUsingSkillsResult> => {
      const client = await getAgentClient({ request });
      return client.removeSkillRefsFromAgents({ skillIds });
    };

    const getAgentsUsingSkills = async ({
      request,
      skillIds,
    }: SkillRefsParams): Promise<AgentsUsingSkillsResult> => {
      const client = await getAgentClient({ request });
      return client.getAgentsUsingSkills({ skillIds });
    };

    return {
      getRegistry,
      ensure,
      resolveAgentConfiguration,
      resolveAgentBaseConfiguration,
      removeToolRefsFromAgents,
      getAgentsUsingTools,
      removePluginRefsFromAgents,
      getAgentsUsingPlugins,
      removeSkillRefsFromAgents,
      getAgentsUsingSkills,
      getAiIndexResolver: () => this.aiIndexResolver,
    };
  }
}
