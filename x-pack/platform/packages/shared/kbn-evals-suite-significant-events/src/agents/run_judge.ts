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
import type { Discovery, SigEvent } from '@kbn/streams-schema';
import type { EvidenceEsqlRecord, JudgeToolUsage, ToolCallRecord } from './types';
import { normalizeWhitespace } from '../evaluators/common/matches_evidence_text';

export interface RunDiscoveryJudgeParams {
  systemPrompt: string;
  outputSchema: Record<string, unknown>;
  discoveries: Discovery[];
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
}

const TOOL_EXECUTE_ESQL = 'execute_esql';

const TOOLS = {
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

function buildUserMessage(discoveries: Discovery[]): string {
  return `## Unreviewed Discoveries\n\n${JSON.stringify(discoveries, null, 2)}`;
}

/**
 * Runs the discovery judge agent inference loop.
 * Handles only `execute_esql` tool calls; records per-evidence coverage keyed
 * by normalized ES|QL query string.
 */
export async function runDiscoveryJudge(
  params: RunDiscoveryJudgeParams
): Promise<{ significantEvents: SigEvent[]; toolUsage: JudgeToolUsage }> {
  const { systemPrompt, outputSchema, discoveries, inferenceClient, esClient, logger, signal } =
    params;

  const toolCallRecords: ToolCallRecord[] = [];
  let totalCalls = 0;
  let failures = 0;
  const executeEsqlPerEvidence: Record<string, EvidenceEsqlRecord> = {};

  // Include output schema guidance in the system prompt so the agent knows the expected format
  const systemWithSchema = `${systemPrompt}\n\nOutput your final answer as JSON matching this schema:\n${JSON.stringify(
    outputSchema,
    null,
    2
  )}`;

  const messages: Parameters<BoundInferenceClient['chatComplete']>[0]['messages'] = [
    { role: MessageRole.User, content: buildUserMessage(discoveries) },
  ];

  let significantEvents: SigEvent[] = [];

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
      try {
        const parsed = JSON.parse(content);
        significantEvents = (parsed.significant_events ?? []) as SigEvent[];
      } catch {
        logger.warn('[runDiscoveryJudge] Could not parse final response as JSON');
        significantEvents = [];
      }
      break;
    }

    messages.push({
      role: MessageRole.Assistant,
      content,
      toolCalls,
    });

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
        if (toolId === TOOL_EXECUTE_ESQL) {
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
          logger.warn(`[runDiscoveryJudge] Unknown tool: ${toolId}`);
          toolResponse = { error: `Unknown tool: ${toolId}` };
          record.error = `Unknown tool: ${toolId}`;
          failures++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`[runDiscoveryJudge] Tool ${toolId} failed: ${errorMsg}`);
        record.error = errorMsg;
        toolResponse = { error: errorMsg };
        failures++;

        if (toolId === TOOL_EXECUTE_ESQL) {
          const esqlQuery = (callParams.esql ?? '') as string;
          const normalizedKey = normalizeWhitespace(esqlQuery);
          executeEsqlPerEvidence[normalizedKey] = {
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
    significantEvents,
    toolUsage: {
      tool_call_records: toolCallRecords,
      total_calls: totalCalls,
      failures,
      execute_esql_per_evidence: executeEsqlPerEvidence,
    },
  };
}
