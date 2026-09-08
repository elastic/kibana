/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { BaseFeature, IgnoredFeature } from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  type InferenceDocument,
  type ExcludedFeatureSummary,
  type PreviouslyIdentifiedFeature,
} from '@kbn/nightshift-ai';
import { createAgentBuilderClient } from '@kbn/evals';
import {
  buildFeatureIdentificationUserMessage,
  FEATURE_IDENTIFICATION_AGENT_ID,
  FINALIZE_FEATURES_TOOL_ID,
  parseFinalizedFeatures,
  type RawFinalizeFeaturesParams,
} from '@kbn/significant-events-plugin/server';

export interface RunFeatureIdentificationAgentParams {
  fetch: HttpHandler;
  log: ToolingLog;
  streamName: string;
  connectorId: string;
  sampleDocuments: InferenceDocument[];
  previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
  excludedFeatures?: ExcludedFeatureSummary[];
  knownFeatureIds?: string;
}

export interface RunFeatureIdentificationAgentResult {
  features: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  tokensUsed: ChatCompletionTokenCount;
}

export async function runFeatureIdentificationAgent({
  fetch,
  log,
  streamName,
  connectorId,
  sampleDocuments,
  previouslyIdentifiedFeatures,
  excludedFeatures,
  knownFeatureIds,
}: RunFeatureIdentificationAgentParams): Promise<RunFeatureIdentificationAgentResult> {
  const agentBuilderClient = createAgentBuilderClient({ fetch, log, connectorId });
  const conversation = await agentBuilderClient.createConversation({
    agentId: FEATURE_IDENTIFICATION_AGENT_ID,
    title: `Feature identification: ${streamName}`,
  });
  const userMessage = buildFeatureIdentificationUserMessage({
    streamName,
    sampleDocuments: JSON.stringify(sampleDocuments),
    previouslyIdentifiedFeatures: previouslyIdentifiedFeatures?.length
      ? JSON.stringify(previouslyIdentifiedFeatures)
      : undefined,
    excludedFeatures: excludedFeatures?.length ? JSON.stringify(excludedFeatures) : undefined,
    knownFeatureIds,
  });
  const result = await agentBuilderClient.converse({
    agentId: FEATURE_IDENTIFICATION_AGENT_ID,
    conversationId: conversation.id,
    input: userMessage,
  });
  const finalizeStep = result.steps.find(
    (step) => step.type === 'tool_call' && step.tool_id === FINALIZE_FEATURES_TOOL_ID
  );
  if (!finalizeStep?.params) {
    throw new Error('Feature identification agent did not call its finalization tool');
  }

  const { features, ignoredFeatures } = parseFinalizedFeatures(
    finalizeStep.params as RawFinalizeFeaturesParams,
    streamName
  );

  return {
    features,
    ignoredFeatures,
    tokensUsed: result.tokensUsed ?? { ...EMPTY_TOKENS },
  };
}
