/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import {
  ANALYZE_AND_IMPROVE_SKILL_ID,
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
} from '../../common/agent_builder_skills';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../common/agent_builder_tools';
import { CONTEXT_ENGINE_SETUP_AGENT_ID } from '../../common/agent_builder_agents';
import instructions from './instructions/context_engine_setup.md.text';

export const CONTEXT_ENGINE_SETUP_AGENT_TYPE_ID =
  `${internalNamespaces.platformContextEngine}.setup-type` as const;

export { CONTEXT_ENGINE_SETUP_AGENT_ID };

export const contextEngineSetupAgentType = {
  id: CONTEXT_ENGINE_SETUP_AGENT_TYPE_ID,
  name: 'Context Engine Setup',
  description:
    'Configures AI indices, chooses data sources, and generates workflow automations that ' +
    'populate indices with useful, relevant data.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions,
    skill_ids: [
      ANALYZE_AND_IMPROVE_SKILL_ID,
      AI_INDEX_AUTOMATIONS_SKILL_ID,
      AI_INDEX_SOURCES_SKILL_ID,
      KI_RETRIEVAL_SKILL_ID,
    ],
    tools: [
      {
        tool_ids: [
          // Platform core tools used across skills
          platformCoreTools.listIndices,
          platformCoreTools.getIndexMapping,
          platformCoreTools.executeEsql,
          platformCoreTools.generateEsql,
          platformCoreTools.generateWorkflow,
          platformCoreTools.executeWorkflow,
          platformCoreTools.getWorkflowExecutionStatus,
          // Context Engine save automation tool
          CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
          // Workflows tools
          `${internalNamespaces.workflows}.get_connectors`,
          `${internalNamespaces.workflows}.get_step_definitions`,
          `${internalNamespaces.workflows}.get_examples`,
          `${internalNamespaces.workflows}.get_workflow`,
          `${internalNamespaces.workflows}.validate_workflow`,
        ],
      },
    ],
    enable_elastic_capabilities: true,
    connector_ids: [],
  },
} as const satisfies AgentTypeDefinition;

export const registerContextEngineAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(contextEngineSetupAgentType);
};
