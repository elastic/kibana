/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { featuresPrompt } from '@kbn/streams-ai';

export const FEATURE_IDENTIFICATION_AGENT_ID = 'significant-events.feature-identification';
export const FEATURE_IDENTIFICATION_AGENT_TYPE_ID =
  'platform.sig_events.feature-identification-type';

export const featureIdentificationAgentType = {
  id: FEATURE_IDENTIFICATION_AGENT_TYPE_ID,
  name: 'Feature Identification',
  description:
    'Extracts stable KI features from sample log documents by identifying entities, dependencies, infrastructure, technologies, and schema patterns, then calls finalize_features with the deduplicated result.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: featuresPrompt,
    skill_ids: ['significant-events-memory'],
    enable_elastic_capabilities: false,
    connector_ids: [],
    tools: [
      {
        tool_ids: [
          platformSignificantEventsTools.searchKnowledgeIndicators,
          platformSignificantEventsTools.searchSimilarFeatures,
          platformSignificantEventsTools.searchEvent,
          platformSignificantEventsTools.finalizeFeatures,
        ],
      },
    ],
  },
} as const satisfies AgentTypeDefinition;

export const registerFeatureIdentificationAgentType = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  agentBuilder.agents.registerType(featureIdentificationAgentType);
};
