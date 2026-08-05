/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import { i18n } from '@kbn/i18n';
import {
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_OTEL_SIGNALS_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_MEMORY_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

const KI_EXTRACTION_RECOMMENDED_MODELS = [
  defaultInferenceEndpoints.OPENAI_GPT_5_4,
  defaultInferenceEndpoints.OPENAI_GPT_OSS_120B,
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
];

const KI_QUERY_GENERATION_RECOMMENDED_MODELS = [
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
  defaultInferenceEndpoints.OPENAI_GPT_5_4,
  defaultInferenceEndpoints.OPENAI_GPT_OSS_120B,
];

// Ordered to keep the recommended default GPT-5.2, matching the hardcoded
// `agentConnectorId` default `discovery.yaml` used before it started resolving via this feature.
const DISCOVERY_RECOMMENDED_MODELS = [
  defaultInferenceEndpoints.OPENAI_GPT_5_2,
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_OPUS,
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
];

const INVESTIGATION_RECOMMENDED_MODELS = [
  defaultInferenceEndpoints.ANTHROPIC_CLAUDE_4_6_SONNET,
  defaultInferenceEndpoints.OPENAI_GPT_5_4,
];

// Background memory upkeep is low-stakes curation, not deep reasoning — a
// smaller/cheaper model keeps latency and cost down.
const MEMORY_RECOMMENDED_MODELS = [
  '.anthropic-claude-4.5-haiku-chat_completion',
  '.openai-gpt-5.4-mini-chat_completion',
];

// Code-intelligence classification is bounded, tool-less, temperature-0 judging
// of grep-discovered candidates (keep/drop, severity, service grouping). A
// bake-off (OTel demo, 273 candidates) showed the cheapest tier matches strong
// models on this task: 100% idiom fidelity across all of them. Default to the
// cheapest capable model; this is ~12x cheaper than the KI-extraction tier and
// keeps a continuously-scheduled extraction affordable.
const CODE_INTELLIGENCE_RECOMMENDED_MODELS = [
  '.google-gemini-3.1-flash-lite-chat_completion',
  '.anthropic-claude-4.5-haiku-chat_completion',
  defaultInferenceEndpoints.OPENAI_GPT_OSS_120B,
];

/**
 * Registers Streams Significant Events parent + child features with the Inference Feature Registry.
 * No-op when the searchInferenceEndpoints plugin is unavailable.
 */
export function registerSignificantEventsInferenceFeatures(
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup | undefined,
  logger: Logger
): void {
  if (!searchInferenceEndpoints) {
    return;
  }

  const { register } = searchInferenceEndpoints.features;

  const parentResult = register({
    featureId: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
    featureName: i18n.translate(
      'xpack.significantEvents.inferenceFeature.significantEventsParentName',
      {
        defaultMessage: 'Streams Significant Events',
      }
    ),
    featureDescription: i18n.translate(
      'xpack.significantEvents.inferenceFeature.significantEventsParentDescription',
      {
        defaultMessage:
          'AI models used for Streams Significant Events (knowledge indicators, queries, discovery).',
      }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: [],
    isTechPreview: true,
  });
  if (parentResult.ok) {
    logger.debug(
      `Registered parent inference feature "${SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID}"`
    );
  } else {
    logger.warn(
      `Failed to register inference feature "${SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID}": ${parentResult.error}`
    );
  }

  const children: Array<{
    featureId: string;
    featureName: string;
    featureDescription: string;
    recommendedEndpoints: string[];
    ignoreGlobalDefault: boolean;
  }> = [
    {
      featureId: SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.significantEvents.inferenceFeature.kiExtractionName', {
        defaultMessage: 'Knowledge Indicator extraction',
      }),
      featureDescription: i18n.translate(
        'xpack.significantEvents.inferenceFeature.kiExtractionDescription',
        {
          defaultMessage: 'Model used to extract Knowledge Indicators.',
        }
      ),
      recommendedEndpoints: KI_EXTRACTION_RECOMMENDED_MODELS,
      ignoreGlobalDefault: true,
    },
    {
      featureId: SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
      featureName: i18n.translate(
        'xpack.significantEvents.inferenceFeature.kiQueryGenerationName',
        {
          defaultMessage: 'Knowledge Indicator Query generation',
        }
      ),
      featureDescription: i18n.translate(
        'xpack.significantEvents.inferenceFeature.kiQueryGenerationDescription',
        {
          defaultMessage: 'Model used for Knowledge Indicator Query generation.',
        }
      ),
      recommendedEndpoints: KI_QUERY_GENERATION_RECOMMENDED_MODELS,
      ignoreGlobalDefault: true,
    },
    {
      featureId: SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.significantEvents.inferenceFeature.codeIntelligenceName', {
        defaultMessage: 'Code Intelligence classification',
      }),
      featureDescription: i18n.translate(
        'xpack.significantEvents.inferenceFeature.codeIntelligenceDescription',
        {
          defaultMessage:
            'Model used to classify grep-discovered code candidates (logging call sites and deployable services). A low-stakes, high-volume task — a fast, cheap model is recommended.',
        }
      ),
      recommendedEndpoints: CODE_INTELLIGENCE_RECOMMENDED_MODELS,
      ignoreGlobalDefault: true,
    },
    {
      featureId: SIGNIFICANT_EVENTS_OTEL_SIGNALS_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.significantEvents.inferenceFeature.otelSignalsName', {
        defaultMessage: 'OTel signal classification',
      }),
      featureDescription: i18n.translate(
        'xpack.significantEvents.inferenceFeature.otelSignalsDescription',
        {
          defaultMessage:
            'Model used for naming, severity, and deduplication of deterministically extracted OTel signals.',
        }
      ),
      recommendedEndpoints: CODE_INTELLIGENCE_RECOMMENDED_MODELS,
      ignoreGlobalDefault: true,
    },
    {
      featureId: SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.significantEvents.inferenceFeature.discoveryName', {
        defaultMessage: 'Discovery',
      }),
      featureDescription: i18n.translate(
        'xpack.significantEvents.inferenceFeature.discoveryDescription',
        {
          defaultMessage: 'Model used during Discovery and Significant Event generation.',
        }
      ),
      recommendedEndpoints: DISCOVERY_RECOMMENDED_MODELS,
      ignoreGlobalDefault: true,
    },
    {
      featureId: SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.significantEvents.inferenceFeature.investigationName', {
        defaultMessage: 'Investigation',
      }),
      featureDescription: i18n.translate(
        'xpack.significantEvents.inferenceFeature.investigationDescription',
        {
          defaultMessage: 'Model used during root cause investigation.',
        }
      ),
      recommendedEndpoints: INVESTIGATION_RECOMMENDED_MODELS,
      ignoreGlobalDefault: true,
    },
    {
      featureId: SIGNIFICANT_EVENTS_MEMORY_INFERENCE_FEATURE_ID,
      featureName: i18n.translate('xpack.significantEvents.inferenceFeature.memoryName', {
        defaultMessage: 'Memory',
      }),
      featureDescription: i18n.translate(
        'xpack.significantEvents.inferenceFeature.memoryDescription',
        {
          defaultMessage:
            'Model used for background memory upkeep: scraping durable knowledge out of chat conversations, synthesizing knowledge indicators into wiki pages, consolidating the wiki, and reconciling knowledge gaps.',
        }
      ),
      recommendedEndpoints: MEMORY_RECOMMENDED_MODELS,
      ignoreGlobalDefault: true,
    },
  ];

  for (const child of children) {
    const childResult = register({
      featureId: child.featureId,
      parentFeatureId: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
      featureName: child.featureName,
      featureDescription: child.featureDescription,
      taskType: 'chat_completion',
      recommendedEndpoints: child.recommendedEndpoints,
      ignoreGlobalDefault: child.ignoreGlobalDefault,
    });
    if (childResult.ok) {
      logger.debug(`Registered child inference feature "${child.featureId}"`);
    } else {
      logger.warn(
        `Failed to register inference feature "${child.featureId}": ${childResult.error}`
      );
    }
  }
}
