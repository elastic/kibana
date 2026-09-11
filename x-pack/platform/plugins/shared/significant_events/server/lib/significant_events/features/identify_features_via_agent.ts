/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, toArray } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  AgentExecutionMode,
  CONVERSATION_TITLE_MAX_LENGTH,
  ConversationAccessControlMode,
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
} from '@kbn/agent-builder-common';
import {
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/significant-events-schema';
import type { BaseFeature, IgnoredFeature } from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  type InferenceDocument,
  type ExcludedFeatureSummary,
  type PreviouslyIdentifiedFeature,
} from '@kbn/nightshift-ai';
import { FEATURE_IDENTIFICATION_AGENT_ID } from '../../../agent_builder/agents/feature_identification';
import { FINALIZE_FEATURES_TOOL_ID } from '../../../agent_builder/skills/feature_identification';
import { parseFinalizedFeatures, type RawFinalizeFeaturesParams } from './parse_finalized_features';
import { buildFeatureIdentificationUserMessage } from './build_user_message';
import { chatTokenCountFromModelUsage } from './chat_token_count';

export interface ExecuteFeatureIdentificationAgentOptions {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  connectorId: string;
  streamName: string;
  sampleDocuments: InferenceDocument[];
  excludedFeatures?: ExcludedFeatureSummary[];
  previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
  knownFeatureIds?: string;
  signal?: AbortSignal;
  logger: Logger;
}

export async function executeFeatureIdentificationAgent({
  agentBuilder,
  request,
  connectorId,
  streamName,
  sampleDocuments,
  excludedFeatures,
  previouslyIdentifiedFeatures = [],
  knownFeatureIds = '',
  signal,
  logger,
}: ExecuteFeatureIdentificationAgentOptions): Promise<{
  features: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  const userMessage = buildFeatureIdentificationUserMessage({
    streamName,
    sampleDocuments: JSON.stringify(sampleDocuments),
    previouslyIdentifiedFeatures:
      previouslyIdentifiedFeatures.length > 0
        ? JSON.stringify(previouslyIdentifiedFeatures)
        : undefined,
    knownFeatureIds: knownFeatureIds || undefined,
    excludedFeatures: excludedFeatures?.length ? JSON.stringify(excludedFeatures) : undefined,
  });

  const conversationClient = await agentBuilder.conversations.getScopedClient({ request });
  const conversation = await conversationClient.create({
    agentId: FEATURE_IDENTIFICATION_AGENT_ID,
    title: `Feature identification: ${streamName}`.slice(0, CONVERSATION_TITLE_MAX_LENGTH),
    accessControl: { access_mode: ConversationAccessControlMode.Private },
  });

  const { events$ } = await agentBuilder.execution.executeAgent({
    mode: AgentExecutionMode.conversation,
    request,
    abortSignal: signal,
    useTaskManager: false,
    params: {
      agentId: FEATURE_IDENTIFICATION_AGENT_ID,
      connectorId,
      conversationId: conversation.id,
      storeConversation: true,
      nextInput: { message: userMessage },
      telemetryMetadata: {
        pluginId: SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
        aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
      },
    },
  });

  const events = await firstValueFrom(events$.pipe(toArray()));

  const successfulFinalizeCallIds = new Set(
    events
      .filter(isToolResultEvent)
      .filter(
        (event) =>
          event.data.tool_id === FINALIZE_FEATURES_TOOL_ID &&
          event.data.results.some(
            (result) =>
              typeof result.data === 'object' &&
              result.data !== null &&
              'finalized' in result.data &&
              result.data.finalized === true
          )
      )
      .map((event) => event.data.tool_call_id)
  );
  const finalizeEvent = events.findLast(
    (event) =>
      isToolCallEvent(event) &&
      event.data.tool_id === FINALIZE_FEATURES_TOOL_ID &&
      successfulFinalizeCallIds.has(event.data.tool_call_id)
  );
  if (!finalizeEvent || !isToolCallEvent(finalizeEvent)) {
    throw new Error('Feature identification agent did not successfully call finalize_features');
  }

  const roundEvent = events.find(isRoundCompleteEvent);
  const rawParams = finalizeEvent.data.params as RawFinalizeFeaturesParams;

  if (!Array.isArray(rawParams.features)) {
    throw new Error('Feature identification agent returned invalid finalize_features output');
  }

  const { features, ignoredFeatures } = parseFinalizedFeatures(rawParams, streamName, logger);

  const tokensUsed: ChatCompletionTokenCount = chatTokenCountFromModelUsage(
    roundEvent?.data.round.model_usage
  ) ?? { ...EMPTY_TOKENS };

  return {
    features,
    ignoredFeatures,
    tokensUsed,
  };
}
