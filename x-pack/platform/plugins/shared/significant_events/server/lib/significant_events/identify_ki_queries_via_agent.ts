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
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  type GeneratedSignificantEventQuery,
} from '@kbn/significant-events-schema';
import { EMPTY_TOKENS } from '@kbn/nightshift-ai';
import type { Streams } from '@kbn/streams-schema';
import type { AnalysisTarget } from '@kbn/nightshift-ai';
import { KI_QUERY_GENERATION_AGENT_ID } from '../../agent_builder/agents/ki_query_generation';
import {
  WRITE_QUERIES_TOOL_ID,
  type AcceptedQuery,
} from '../../agent_builder/skills/ki_query_generation';
import { chatTokenCountFromModelUsage } from './features/chat_token_count';
import { streamToAnalysisTarget } from './stream_to_analysis_target';

export interface ExecuteKIQueryGenerationAgentOptions {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  connectorId: string;
  definition: Streams.all.Definition;
  signal?: AbortSignal;
  logger: Logger;
}

export async function executeKIQueryGenerationAgent({
  agentBuilder,
  request,
  connectorId,
  definition,
  signal,
  logger,
}: ExecuteKIQueryGenerationAgentOptions): Promise<{
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  const target = streamToAnalysisTarget(definition);
  const userMessage = buildKIQueryGenerationUserMessage(target);

  const conversationClient = await agentBuilder.conversations.getScopedClient({ request });
  const conversation = await conversationClient.create({
    agentId: KI_QUERY_GENERATION_AGENT_ID,
    title: `KI query generation: ${definition.name}`.slice(0, CONVERSATION_TITLE_MAX_LENGTH),
    accessControl: { access_mode: ConversationAccessControlMode.Private },
  });

  const { events$ } = await agentBuilder.execution.executeAgent({
    mode: AgentExecutionMode.conversation,
    request,
    abortSignal: signal,
    useTaskManager: false,
    params: {
      agentId: KI_QUERY_GENERATION_AGENT_ID,
      connectorId,
      conversationId: conversation.id,
      storeConversation: true,
      nextInput: { message: userMessage },
      telemetryMetadata: {
        pluginId: SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
        aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
      },
    },
  });

  const events = await firstValueFrom(events$.pipe(toArray()));

  const successfulWriteCallIds = new Set(
    events
      .filter(isToolResultEvent)
      .filter(
        (event) =>
          event.data.tool_id === WRITE_QUERIES_TOOL_ID &&
          event.data.results.some(
            (result) =>
              typeof result.data === 'object' &&
              result.data !== null &&
              'written' in result.data &&
              result.data.written === true
          )
      )
      .map((event) => event.data.tool_call_id)
  );

  const writeEvent = events.findLast(
    (event) =>
      isToolCallEvent(event) &&
      event.data.tool_id === WRITE_QUERIES_TOOL_ID &&
      successfulWriteCallIds.has(event.data.tool_call_id)
  );

  if (!writeEvent || !isToolCallEvent(writeEvent)) {
    throw new Error('KI query generation agent did not successfully call write_queries');
  }

  const roundEvent = events.find(isRoundCompleteEvent);
  const rawParams = writeEvent.data.params as { queries: AcceptedQuery[] };

  if (!Array.isArray(rawParams.queries)) {
    throw new Error('KI query generation agent returned invalid write_queries output');
  }

  const queries: GeneratedSignificantEventQuery[] = rawParams.queries.map((q) => ({
    type: q.type,
    title: q.title,
    description: q.description,
    esql: q.esql,
    severity_score: q.severity_score,
    evidence: q.evidence,
    replaces: q.replaces,
    features: q.features,
  }));

  const tokensUsed: ChatCompletionTokenCount = chatTokenCountFromModelUsage(
    roundEvent?.data.round.model_usage
  ) ?? { ...EMPTY_TOKENS };

  logger.debug(
    `KI query generation agent returned ${queries.length} queries for "${definition.name}"`
  );

  return { queries, tokensUsed };
}

export function buildKIQueryGenerationUserMessage(target: AnalysisTarget): string {
  const parts: string[] = [];
  parts.push(`\`target_id\`: ${target.id}`);
  parts.push(`\`target_name\`: ${target.name}`);
  if (target.description) {
    parts.push(`\`target_description\`: ${target.description}`);
  }
  parts.push(`\`sources\`: ${target.sources.join(', ')}`);
  return parts.join('\n\n');
}
