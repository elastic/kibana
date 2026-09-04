/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { firstValueFrom, toArray } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  AgentExecutionMode,
  isToolCallEvent,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import {
  identifiedFeatureSchema,
  ignoredFeatureSchema,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/significant-events-schema';
import type { BaseFeature, IgnoredFeature } from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  type InferenceDocument,
  type ExcludedFeatureSummary,
  type PreviouslyIdentifiedFeature,
} from '@kbn/streams-ai';
import { conditionSchema, isConditionComplete, type Condition } from '@kbn/streamlang';
import { FEATURE_IDENTIFICATION_AGENT_ID } from '../../../agent_builder/agents/feature_identification';

const MAX_EVIDENCE_ITEMS = 5;
const MAX_IDENTIFIED_FEATURES_PER_ITERATION = 100;

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

export function buildFeatureIdentificationUserMessage({
  streamName,
  sampleDocuments,
  previouslyIdentifiedFeatures,
  knownFeatureIds,
  excludedFeatures,
}: {
  streamName: string;
  sampleDocuments: string;
  previouslyIdentifiedFeatures?: string;
  knownFeatureIds?: string;
  excludedFeatures?: string;
}): string {
  const parts: string[] = [];
  parts.push(`\`stream_name\`: ${streamName}`);
  if (excludedFeatures) {
    parts.push(`\`excluded_features\`:\n${excludedFeatures}`);
  }
  if (previouslyIdentifiedFeatures) {
    parts.push(`\`previously_identified_features\`:\n${previouslyIdentifiedFeatures}`);
  }
  if (knownFeatureIds) {
    parts.push(`\`known_feature_ids\`:\n${knownFeatureIds}`);
  }
  parts.push(`\`sample_documents\`:\n${sampleDocuments}`);
  return parts.join('\n\n');
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

  const { events$ } = await agentBuilder.execution.executeAgent({
    mode: AgentExecutionMode.conversation,
    request,
    abortSignal: signal,
    useTaskManager: false,
    params: {
      agentId: FEATURE_IDENTIFICATION_AGENT_ID,
      connectorId,
      nextInput: { message: userMessage },
      telemetryMetadata: {
        pluginId: SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
        aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
      },
    },
  });

  const events = await firstValueFrom(events$.pipe(toArray()));

  const normalizeId = (id: string) => id.replace(/\./g, '_');
  const targetToolId = normalizeId(platformSignificantEventsTools.finalizeFeatures);

  const finalizeEvent = events.find(
    (e) => isToolCallEvent(e) && normalizeId(e.data.tool_id) === targetToolId
  );

  if (!finalizeEvent || !isToolCallEvent(finalizeEvent)) {
    throw new Error('Feature identification agent did not call finalize_features');
  }

  const rawParams = finalizeEvent.data.params as {
    features?: unknown;
    ignored_features?: unknown;
  };

  if (!Array.isArray(rawParams.features)) {
    throw new Error('Feature identification agent returned invalid finalize_features output');
  }

  const finalizedFeatures: BaseFeature[] = [];
  const ignoredFeatures: IgnoredFeature[] = [];

  for (const feature of rawParams.features) {
    const candidate = {
      ...(feature as Record<string, unknown>),
      stream_name: streamName,
      filter: tryParseFilter((feature as Record<string, unknown>).filter),
      ...(Array.isArray((feature as Record<string, unknown>).evidence)
        ? {
            evidence: ((feature as Record<string, unknown>).evidence as unknown[]).slice(
              0,
              MAX_EVIDENCE_ITEMS
            ),
          }
        : {}),
    };
    const result = identifiedFeatureSchema.safeParse(candidate);
    if (!result.success || Object.keys(result.data.properties).length === 0) {
      logger.debug(
        `Skipping invalid feature: ${result.success ? 'empty properties' : result.error.message}`
      );
      continue;
    }
    finalizedFeatures.push(result.data);
  }

  const rawIgnored = rawParams.ignored_features;
  for (const item of Array.isArray(rawIgnored) ? rawIgnored : []) {
    const result = ignoredFeatureSchema.safeParse(item);
    if (result.success) {
      ignoredFeatures.push(result.data);
    }
  }

  const roundEvent = events.find(isRoundCompleteEvent);
  const modelUsage = roundEvent?.data.round.model_usage;
  const tokensUsed: ChatCompletionTokenCount = modelUsage
    ? {
        prompt: modelUsage.input_tokens,
        completion: modelUsage.output_tokens,
        total: modelUsage.input_tokens + modelUsage.output_tokens,
        cached: modelUsage.cached_input_tokens,
      }
    : { ...EMPTY_TOKENS };

  return {
    features: uniqBy(finalizedFeatures, (f) => f.id).slice(
      0,
      MAX_IDENTIFIED_FEATURES_PER_ITERATION
    ),
    ignoredFeatures,
    tokensUsed,
  };
}

function tryParseFilter(maybeFilter: unknown): Condition | undefined {
  if (!maybeFilter) {
    return undefined;
  }
  const result = conditionSchema.safeParse(maybeFilter);
  if (!result.success) {
    return undefined;
  }
  return isConditionComplete(result.data) ? result.data : undefined;
}
