/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type {
  AgentAvailabilityConfig,
  AgentTypeDefinition,
} from '@kbn/agent-builder-server/agents';
import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  ANALYZE_AND_IMPROVE_SKILL_ID,
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
  CONTEXT_ENGINE_SIGNALS_SKILL_ID,
} from '../../common/agent_builder_skills';
import { CONTEXT_ENGINE_SETUP_AGENT_ID } from '../../common/agent_builder_agents';
import instructions from './instructions/context_engine_setup.md.text';

export { CONTEXT_ENGINE_SETUP_AGENT_ID };

export const CONTEXT_ENGINE_SETUP_AGENT_TYPE_ID =
  `${internalNamespaces.platformContextEngine}.setup-type` as const;

const contextEngineSetupAgentType = {
  id: CONTEXT_ENGINE_SETUP_AGENT_TYPE_ID,
  name: 'Context Engine',
  description:
    'Configures AI indices, chooses data sources, and generates workflow automations that ' +
    'populate indices with useful, relevant data.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    tools: [],
    skill_ids: [],
    connector_ids: [],
    enable_elastic_capabilities: false,
  },
} as const satisfies AgentTypeDefinition;

const contextEngineAgentAvailability: AgentAvailabilityConfig = {
  cacheMode: 'space',
  handler: async ({ uiSettings }) => {
    const enabled = await uiSettings
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)
      .catch(() => false);
    if (!enabled) {
      return { status: 'unavailable', reason: 'Context Engine is disabled in this space.' };
    }
    return { status: 'available' };
  },
};

export const registerContextEngineAgent = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(contextEngineSetupAgentType);
  agentBuilder.agents.register({
    type: CONTEXT_ENGINE_SETUP_AGENT_TYPE_ID,
    id: CONTEXT_ENGINE_SETUP_AGENT_ID,
    name: 'Context Engine',
    description:
      'Configures AI indices, chooses data sources, and generates workflow automations that ' +
      'populate indices with useful, relevant data.',
    avatar_icon: 'logoElastic',
    availability: contextEngineAgentAvailability,
    configuration: {
      instructions,
      skill_ids: [
        ANALYZE_AND_IMPROVE_SKILL_ID,
        AI_INDEX_AUTOMATIONS_SKILL_ID,
        AI_INDEX_SOURCES_SKILL_ID,
        KI_RETRIEVAL_SKILL_ID,
        CONTEXT_ENGINE_SIGNALS_SKILL_ID,
      ],
      tools: [
        {
          tool_ids: [
            platformCoreTools.listIndices,
            platformCoreTools.getIndexMapping,
            platformCoreTools.executeEsql,
            platformCoreTools.generateEsql,
            platformCoreTools.executeWorkflow,
            platformCoreTools.getWorkflowExecutionStatus,
            `${internalNamespaces.workflows}.get_connectors`,
            `${internalNamespaces.workflows}.get_step_definitions`,
            `${internalNamespaces.workflows}.get_examples`,
            `${internalNamespaces.workflows}.get_workflow`,
            `${internalNamespaces.workflows}.validate_workflow`,
          ],
        },
      ],
      enable_elastic_capabilities: false,
      subagent_ids: [SELF_AGENT_ID],
      connector_ids: [],
    },
  });
};
