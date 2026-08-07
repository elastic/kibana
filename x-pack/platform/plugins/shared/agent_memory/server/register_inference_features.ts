/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';

/**
 * Inference feature the curation workflows resolve their connector from
 * (`connector-id-by-feature: "agent_memory"` in the workflow YAML).
 *
 * Top-level rather than a child of the Significant Events feature, so memory's
 * LLM cost is attributed to memory and survives Significant Events being off.
 */
export const AGENT_MEMORY_INFERENCE_FEATURE_ID = 'agent_memory';

// Curation is low-stakes editing, not deep reasoning — a smaller model keeps
// latency and cost down for work that runs on a schedule.
const AGENT_MEMORY_RECOMMENDED_MODELS = [
  '.anthropic-claude-4.5-haiku-chat_completion',
  '.openai-gpt-5.4-mini-chat_completion',
];

/** No-op when the searchInferenceEndpoints plugin is unavailable. */
export function registerAgentMemoryInferenceFeatures(
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined,
  logger: Logger
): void {
  if (!searchInferenceEndpoints) {
    return;
  }

  const result = searchInferenceEndpoints.features.register({
    featureId: AGENT_MEMORY_INFERENCE_FEATURE_ID,
    featureName: i18n.translate('xpack.agentMemory.inferenceFeature.name', {
      defaultMessage: 'Agent memory',
    }),
    featureDescription: i18n.translate('xpack.agentMemory.inferenceFeature.description', {
      defaultMessage:
        'Model used for background memory upkeep: distilling durable knowledge out of conversations, consolidating the knowledge base, and reconciling gaps.',
    }),
    taskType: 'chat_completion',
    recommendedEndpoints: AGENT_MEMORY_RECOMMENDED_MODELS,
    ignoreGlobalDefault: true,
  });

  if (result.ok) {
    logger.debug(`Registered inference feature "${AGENT_MEMORY_INFERENCE_FEATURE_ID}"`);
  } else {
    logger.warn(
      `Failed to register inference feature "${AGENT_MEMORY_INFERENCE_FEATURE_ID}": ${result.error}`
    );
  }
}
