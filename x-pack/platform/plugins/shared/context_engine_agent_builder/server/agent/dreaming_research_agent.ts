/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { CONTEXT_ENGINE_DREAMING_RESEARCH_AGENT_ID } from '../../common/agent_builder_agents';
import instructions from './instructions/dreaming_research.md.text';

export { CONTEXT_ENGINE_DREAMING_RESEARCH_AGENT_ID };

/** The tools of the research agent: reading Elasticsearch, and running connector sub-actions. */
export const DREAMING_RESEARCH_TOOL_IDS: readonly string[] = [
  platformCoreTools.search,
  platformCoreTools.getIndexMapping,
  platformCoreTools.executeEsql,
  platformCoreTools.executeConnectorSubAction,
];

const availability: AgentAvailabilityConfig = {
  cacheMode: 'space',
  handler: async ({ uiSettings }) => {
    const enabled = await uiSettings
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)
      .catch(() => false);
    return enabled
      ? { status: 'available' }
      : { status: 'unavailable', reason: 'Context Engine is disabled in this space.' };
  },
};

/**
 * Registers the agent dreaming researches with. Its connectors are the read-only ones the caller
 * can see, resolved on each run: the connector tool refuses any other, so the agent cannot write
 * through a connector even though it runs unattended.
 */
export const registerDreamingResearchAgent = (
  agentBuilder: AgentBuilderPluginSetup,
  getReadOnlyConnectorIds: (request: KibanaRequest) => Promise<string[]>
): void => {
  agentBuilder.agents.register({
    type: chatAgentTypeId,
    id: CONTEXT_ENGINE_DREAMING_RESEARCH_AGENT_ID,
    name: 'Context Engine research',
    description:
      'Researches the sources of an AI index for dreaming: searches its indices and reads through its read-only connectors.',
    avatar_icon: 'logoElastic',
    availability,
    hidden: true,
    configuration: async ({ request }) => ({
      instructions,
      tools: [{ tool_ids: [...DREAMING_RESEARCH_TOOL_IDS] }],
      skill_ids: [],
      ai_indices: [],
      enable_elastic_capabilities: false,
      connector_ids: await getReadOnlyConnectorIds(request),
    }),
  });
};
