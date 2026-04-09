/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type {
  DataStreamDefinition,
  DataStreamsSetup,
  IDataStreamClient,
} from '@kbn/core-data-streams-server';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';

/** Logs data stream on the Kibana Elasticsearch cluster (not Kibana server log files). */
export const ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM =
  'logs-elastic_ramen.llm_gateway-default';

/** Bump when changing mappings or template settings. */
const LLM_GATEWAY_TELEMETRY_DATA_STREAM_VERSION = 2;

const llmGatewayTelemetryMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    message: mappings.text(),
    tags: mappings.keyword(),
    data_stream: mappings.object({
      properties: {
        type: mappings.keyword(),
        dataset: mappings.keyword(),
        namespace: mappings.keyword(),
      },
    }),
    event: mappings.object({
      properties: {
        action: mappings.keyword(),
        kind: mappings.keyword(),
        dataset: mappings.keyword(),
        outcome: mappings.keyword(),
      },
    }),
    gen_ai: mappings.object({
      properties: {
        system: mappings.keyword(),
        operation: mappings.object({
          properties: {
            name: mappings.keyword(),
          },
        }),
        request: mappings.object({
          properties: {
            model: mappings.keyword(),
          },
        }),
        usage: mappings.object({
          properties: {
            input_tokens: mappings.long(),
            output_tokens: mappings.long(),
            total_tokens: mappings.long(),
            /** Subset of prompt tokens served from the model provider cache (e.g. OpenAI `cached_tokens`). */
            cache_read_tokens: mappings.long(),
            /** Prompt tokens not served from cache: `input_tokens - cache_read_tokens` when cache is reported. */
            non_cached_input_tokens: mappings.long(),
            thinking_tokens: mappings.long(),
          },
        }),
      },
    }),
    elastic_ramen: mappings.object({
      properties: {
        connector_id: mappings.keyword(),
        model: mappings.keyword(),
        streaming: mappings.boolean(),
        tool_call_count: mappings.long(),
        outcome: mappings.keyword(),
        error: mappings.keyword({ ignore_above: 4096 }),
      },
    }),
  },
} satisfies MappingsDefinition;

export interface LlmGatewayTelemetryParams {
  streaming: boolean;
  connectorId: string;
  model: string;
  toolCallCount: number;
  tokens?: ChatCompletionTokenCount;
  outcome: 'success' | 'error';
  errorMessage?: string;
}

export interface LlmGatewayTelemetryDocument
  extends GetFieldsOf<typeof llmGatewayTelemetryMappings> {
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

const llmGatewayTelemetryDataStreamDefinition: DataStreamDefinition<
  typeof llmGatewayTelemetryMappings
> = {
  name: ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM,
  version: LLM_GATEWAY_TELEMETRY_DATA_STREAM_VERSION,
  hidden: false,
  template: {
    mappings: llmGatewayTelemetryMappings,
    settings: {
      hidden: false,
    },
  },
};

export function registerLlmGatewayTelemetryDataStream(dataStreams: DataStreamsSetup): void {
  dataStreams.registerDataStream(llmGatewayTelemetryDataStreamDefinition);
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

export type LlmGatewayTelemetryWriter = (params: LlmGatewayTelemetryParams) => void;

export function createLlmGatewayTelemetryWriter({
  logger,
  coreSetup,
  onFirstGatewayUse,
}: {
  logger: Logger;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  onFirstGatewayUse?: () => void;
}): LlmGatewayTelemetryWriter {
  let firstInvocation = true;
  let clientPromise: Promise<
    IDataStreamClient<typeof llmGatewayTelemetryMappings, LlmGatewayTelemetryDocument>
  > | null = null;

  const getClient = (): Promise<
    IDataStreamClient<typeof llmGatewayTelemetryMappings, LlmGatewayTelemetryDocument>
  > => {
    if (!clientPromise) {
      clientPromise = coreSetup
        .getStartServices()
        .then(([coreStart]) =>
          coreStart.dataStreams.initializeClient<
            typeof llmGatewayTelemetryMappings,
            LlmGatewayTelemetryDocument
          >(ELASTIC_RAMEN_LLM_GATEWAY_TELEMETRY_DATA_STREAM)
        );
    }
    return clientPromise;
  };

  return (params: LlmGatewayTelemetryParams) => {
    if (firstInvocation) {
      firstInvocation = false;
      onFirstGatewayUse?.();
    }
    void getClient()
      .then((client) =>
        client.create({
          documents: [buildLlmGatewayTelemetryDocument(params)],
        })
      )
      .catch((err: Error) =>
        logger.error(`Failed to index Elastic Ramen LLM gateway telemetry: ${err.message}`)
      );
  };
}
