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
import { platformStreamsMemoryTools } from '../../../memory_and_investigation/tools/memory/tool_ids';

export const FEATURE_IDENTIFICATION_AGENT_ID = 'significant-events.feature-identification';
export const FEATURE_IDENTIFICATION_AGENT_TYPE_ID =
  'platform.sig_events.feature-identification-type';

const featureIdentificationInstructions = `${featuresPrompt}

## Prior-knowledge grounding

Before finalizing, call \`platform_sig_events_memory_search\` at least once, scoped to the services, symptoms, and patterns in the sample documents. For the initial search, omit \`categories\`, \`tags\`, and \`references\`; use these filters only when you know exact stored values. An empty result is acceptable; skipping the search is not. Use \`platform_sig_events_memory_read\` for relevant pages and \`platform_sig_events_memory_list\` only when you need to browse available pages.

Memory contains durable prior knowledge, known-benign patterns, and past false positives. Use it to avoid regenerating known-bad or demoted features, but keep every emitted feature grounded in the current sample documents.

Search prior Significant Events with \`platform_sig_events_event_search\` when they can clarify whether a candidate is known noise, demoted, or already investigated. Use the full view when assessment notes or investigation outcomes are relevant, and scope the search to the current stream.

Use \`platform_sig_events_ki_feature_similarity_search\` for the batched semantic duplicate check described above. After grounding and duplicate checks are complete, call \`platform_sig_events_ki_feature_finalize\` exactly once.`;

export const featureIdentificationAgentType = {
  id: FEATURE_IDENTIFICATION_AGENT_TYPE_ID,
  name: 'Feature Identification',
  description:
    'Extracts stable KI features from sample log documents by identifying entities, dependencies, infrastructure, technologies, and schema patterns, then calls finalize_features with the deduplicated result.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: featureIdentificationInstructions,
    skill_ids: [],
    enable_elastic_capabilities: false,
    connector_ids: [],
    tools: [
      {
        tool_ids: [
          platformStreamsMemoryTools.memorySearch,
          platformStreamsMemoryTools.memoryRead,
          platformStreamsMemoryTools.memoryList,
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
