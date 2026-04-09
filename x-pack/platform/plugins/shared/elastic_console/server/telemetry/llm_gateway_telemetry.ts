/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';

/** Logs data stream on the Kibana Elasticsearch cluster (not Kibana server log files). */
export const ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM =
  'logs-elastic_ramen.llm_gateway-default';

export interface LlmGatewayTelemetryParams {
  streaming: boolean;
  connectorId: string;
  model: string;
  toolCallCount: number;
  tokens?: ChatCompletionTokenCount;
  outcome: 'success' | 'error';
  errorMessage?: string;
}

export interface LlmGatewayTelemetryDocument {
  '@timestamp': string;
  message: string;
  tags: string[];
  data_stream: {
    type: string;
    dataset: string;
    namespace: string;
  };
  event: {
    action: string;
    kind: string;
    dataset: string;
    outcome: string;
  };
  gen_ai?: {
    system?: string;
    operation?: { name?: string };
    request?: { model?: string };
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
      cache_read_tokens?: number;
      non_cached_input_tokens?: number;
      thinking_tokens?: number;
    };
  };
  elastic_ramen: {
    connector_id: string;
    model: string;
    streaming: boolean;
    tool_call_count: number;
    outcome: string;
    error?: string;
  };
}

export function buildLlmGatewayTelemetryDocument(
  params: LlmGatewayTelemetryParams
): LlmGatewayTelemetryDocument {
  const doc: LlmGatewayTelemetryDocument = {
    '@timestamp': new Date().toISOString(),
    message: 'Elastic Ramen LLM gateway chat completion',
    tags: ['elastic_ramen', 'llm_gateway'],
    data_stream: {
      type: 'logs',
      dataset: 'elastic_ramen.llm_gateway',
      namespace: 'default',
    },
    event: {
      action: 'llm_gateway.chat_completion',
      kind: 'event',
      dataset: 'elastic_console.llm_gateway',
      outcome: params.outcome === 'success' ? 'success' : 'failure',
    },
    elastic_ramen: {
      connector_id: params.connectorId,
      model: params.model,
      streaming: params.streaming,
      tool_call_count: params.toolCallCount,
      outcome: params.outcome,
      ...(params.errorMessage ? { error: params.errorMessage } : {}),
    },
  };

  if (params.tokens) {
    const { prompt, completion, total, cached, thinking } = params.tokens;
    doc.gen_ai = {
      system: 'elastic_ramen',
      operation: { name: 'chat_completion' },
      request: { model: params.model },
      usage: {
        input_tokens: prompt,
        output_tokens: completion,
        total_tokens: total,
        ...(thinking !== undefined ? { thinking_tokens: thinking } : {}),
        ...(cached !== undefined
          ? {
              cache_read_tokens: cached,
              non_cached_input_tokens: Math.max(0, prompt - cached),
            }
          : {}),
      },
    };
  }

  return doc;
}

export type LlmGatewayTelemetryWriter = (
  params: LlmGatewayTelemetryParams,
  esClient: ElasticsearchClient
) => void;

export function createLlmGatewayTelemetryWriter({
  logger,
  onFirstGatewayUse,
}: {
  logger: Logger;
  onFirstGatewayUse?: () => void;
}): LlmGatewayTelemetryWriter {
  let firstInvocation = true;

  return (params: LlmGatewayTelemetryParams, esClient: ElasticsearchClient) => {
    if (firstInvocation) {
      firstInvocation = false;
      onFirstGatewayUse?.();
    }
    void esClient
      .index({
        index: ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM,
        document: buildLlmGatewayTelemetryDocument(params),
      })
      .catch((err: Error) =>
        logger.error(`Failed to index Elastic Ramen LLM gateway telemetry: ${err.message}`)
      );
  };
}
