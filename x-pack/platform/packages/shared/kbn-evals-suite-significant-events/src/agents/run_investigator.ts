/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole, ToolChoiceType } from '@kbn/inference-common';
import type { Detection, Discovery, Feature } from '@kbn/streams-schema';
import type { DiscoveryInvestigatorToolUsage, EvidenceEsqlRecord, ToolCallRecord } from './types';
import { normalizeWhitespace } from '../evaluators/common/matches_evidence_text';

export interface RunDiscoveryInvestigatorParams {
  systemPrompt: string;
  outputSchema: Record<string, unknown>;
  detections: Detection[];
  continuationCandidates?: Discovery[];
  knowledgeIndicators: Feature[];
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
}

const TOOL_SEARCH_KI = 'search_knowledge_indicators';
const TOOL_EXECUTE_ESQL = 'execute_esql';

const TOOLS = {
  [TOOL_SEARCH_KI]: {
    description:
      'Search knowledge indicators for the given stream by type filter. Returns matching KI features.',
    schema: {
      type: 'object' as const,
      properties: {
        stream_name: { type: 'string' as const },
        types: { type: 'array' as const, items: { type: 'string' as const } },
        query: { type: 'string' as const },
      },
    },
  },
  [TOOL_EXECUTE_ESQL]: {
    description: 'Execute an ES|QL query and return the results.',
    schema: {
      type: 'object' as const,
      properties: {
        esql: { type: 'string' as const },
      },
    },
  },
} as const;

function buildUserMessage(detections: Detection[], continuationCandidates?: Discovery[]): string {
  const executionSuffix = Date.now().toString(36).slice(-8);

  let message = `## New episode suffix\n${executionSuffix}\n\n## Active batch\n${JSON.stringify(
    detections,
    null,
    2
  )}`;

  if (continuationCandidates && continuationCandidates.length > 0) {
    message += `\n\n## Continuation Candidates\n${JSON.stringify(continuationCandidates, null, 2)}`;
  }

  return message;
}

function matchesKISearch(ki: Feature, callParams: Record<string, unknown>): boolean {
  const types = callParams.types as string[] | undefined;
  const query = callParams.query as string | undefined;

  if (types && types.length > 0) {
    const kiType = (ki as Record<string, unknown>).type as string | undefined;
    if (kiType && !types.includes(kiType)) {
      return false;
    }
  }

  if (query) {
    const normalizedQuery = query.trim().toLowerCase();
    const kiStr = JSON.stringify(ki).toLowerCase();
    if (!kiStr.includes(normalizedQuery)) {
      return false;
    }
  }

  return true;
}

/**
 * Runs the discovery investigator agent inference loop.
 * Handles `search_knowledge_indicators` in-memory (deterministic) and
 * `execute_esql` by forwarding to ES.
 */
export async function runDiscoveryInvestigator(
  params: RunDiscoveryInvestigatorParams
): Promise<{ discoveries: Discovery[]; toolUsage: DiscoveryInvestigatorToolUsage }> {
  const {
    systemPrompt,
    outputSchema,
    detections,
    continuationCandidates,
    knowledgeIndicators,
    inferenceClient,
    esClient,
    logger,
    signal,
  } = params;

  const toolCallRecords: ToolCallRecord[] = [];
  const executeEsqlPerEvidence: Record<string, EvidenceEsqlRecord> = {};
  let totalCalls = 0;
  let failures = 0;

  // Include output schema guidance in the system prompt so the agent knows the expected format
  const systemWithSchema = `${systemPrompt}\n\nOutput your final answer as JSON matching this schema:\n${JSON.stringify(
    outputSchema,
    null,
    2
  )}`;

  const messages: Parameters<BoundInferenceClient['chatComplete']>[0]['messages'] = [
    { role: MessageRole.User, content: buildUserMessage(detections, continuationCandidates) },
  ];

  let discoveries: Discovery[] = [];

  while (true) {
    const response = await inferenceClient.chatComplete({
      system: systemWithSchema,
      messages,
      tools: TOOLS,
      toolChoice: ToolChoiceType.auto,
      abortSignal: signal,
    });

    const { content, toolCalls } = response;

    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls — parse structured output from content
      try {
        const parsed = JSON.parse(content);
        discoveries = (parsed.discoveries ?? []) as Discovery[];
      } catch {
        logger.warn('[runDiscoveryInvestigator] Could not parse final response as JSON');
        discoveries = [];
      }
      break;
    }

    // Append assistant message with tool calls to conversation
    messages.push({
      role: MessageRole.Assistant,
      content,
      toolCalls,
    });

    // Process each tool call and add tool response messages
    for (const toolCall of toolCalls) {
      const toolId = toolCall.function.name;
      const toolCallId = toolCall.toolCallId;
      const callParams = toolCall.function.arguments as Record<string, unknown>;

      totalCalls++;
      const record: ToolCallRecord = {
        tool_id: toolId,
        tool_call_id: toolCallId,
        params: callParams,
      };

      let toolResponse: Record<string, unknown>;

      try {
        if (toolId === TOOL_SEARCH_KI) {
          const matched = knowledgeIndicators.filter((ki) => matchesKISearch(ki, callParams));
          toolResponse = { features: matched };
          record.result = toolResponse;
        } else if (toolId === TOOL_EXECUTE_ESQL) {
          const esqlQuery = (callParams.esql ?? '') as string;
          const normalizedKey = normalizeWhitespace(esqlQuery);
          const esqlResult = await esClient.esql.query({ query: esqlQuery });
          const esqlResultObj = esqlResult as unknown as Record<string, unknown>;
          const returnedRows =
            Array.isArray(esqlResultObj.values) && (esqlResultObj.values as unknown[]).length > 0;
          record.result = esqlResult;
          toolResponse = esqlResultObj;
          executeEsqlPerEvidence[normalizedKey] = {
            called: true,
            returned_rows: returnedRows,
            tool_call_id: toolCallId,
          };
        } else {
          logger.warn(`[runDiscoveryInvestigator] Unknown tool: ${toolId}`);
          toolResponse = { error: `Unknown tool: ${toolId}` };
          record.error = `Unknown tool: ${toolId}`;
          failures++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`[runDiscoveryInvestigator] Tool ${toolId} failed: ${errorMsg}`);
        record.error = errorMsg;
        toolResponse = { error: errorMsg };
        failures++;

        if (toolId === TOOL_EXECUTE_ESQL) {
          const esqlQuery = (callParams.esql ?? '') as string;
          executeEsqlPerEvidence[normalizeWhitespace(esqlQuery)] = {
            called: true,
            returned_rows: false,
            tool_call_id: toolCallId,
          };
        }
      }

      toolCallRecords.push(record);

      messages.push({
        role: MessageRole.Tool,
        name: toolId,
        toolCallId,
        response: toolResponse,
      });
    }
  }

  return {
    discoveries,
    toolUsage: {
      tool_call_records: toolCallRecords,
      total_calls: totalCalls,
      failures,
      execute_esql_per_evidence: executeEsqlPerEvidence,
    },
  };
}
