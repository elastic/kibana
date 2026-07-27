/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformSignificantEventsTools, platformCoreTools } from '@kbn/agent-builder-common/tools';
import { SIGNIFICANT_EVENTS_KI_GROUNDING_SKILL_ID } from '../../skills/significant_events_ki_grounding';
import instructions from './instructions/discovery.md.text';

export const SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID = 'significant_events.discovery';
export const SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID = 'platform.sig_events.discovery-type';

export const discoveryAgentType = {
  id: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
  name: 'Significant Events Discovery',
  description:
    'Triages statistical detection signals across rules, correlates related detections into incident candidates using shared infrastructure, temporal proximity, and causal plausibility, and drafts structured discovery documents with root-cause hypotheses and supporting evidence.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions,
    skill_ids: [SIGNIFICANT_EVENTS_KI_GROUNDING_SKILL_ID],
    // The tool set below is fully explicit — the generic platform_core_* tools are irrelevant
    // to discovery and only add noise to tool selection, so elastic capabilities stay disabled.
    enable_elastic_capabilities: false,
    // Keep connectors empty so admin-selected connectors persist on the derived agent and merge
    // into this allow-list.
    connector_ids: [],
    tools: [
      {
        tool_ids: [
          platformCoreTools.executeEsql,
          platformSignificantEventsTools.searchKnowledgeIndicators,
          platformSignificantEventsTools.searchEvent,
          platformSignificantEventsTools.discoveryWrite,
        ],
      },
    ],
  },
} as const satisfies AgentTypeDefinition;

export const registerDiscoveryAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(discoveryAgentType);
};
