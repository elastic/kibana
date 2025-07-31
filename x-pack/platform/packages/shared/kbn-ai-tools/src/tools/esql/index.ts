/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  BoundInferenceClient,
  ToolCallbacksOf,
  ToolDefinition,
  ToolOptions,
} from '@kbn/inference-common';
import type { PromptOptions } from '@kbn/inference-common/src/prompt/api';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server';
import type { ReasoningPromptResponseOf } from '@kbn/inference-prompt-utils';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { once } from 'lodash';
import { createDescribeDatasetToolCallback } from './create_describe_dataset_tool_callback';
import { createGetDocumentationToolCallback } from './create_get_documentation_callback';
import { createListDatasetsToolCallback } from './create_list_datasets_tool_callback';
import { createRunQueriesToolCallback } from './create_run_queries_tool_callback';
import { createValidateQueriesToolCallback } from './create_validate_queries_tool_callbacks';
import { EsqlPrompt } from './prompt';
import type {
  EsqlReasoningPromptResponse,
  EsqlReasoningToolCallbacks,
  EsqlReasoningToolOptions,
} from './types';

const loadEsqlDocBase = once(() => EsqlDocumentBase.load());

export async function executeAsEsqlAgent<
  TTools extends Record<string, ToolDefinition> | undefined,
  TToolCallbacks extends ToolCallbacksOf<{ tools: TTools }>
>(
  options: {
    inferenceClient: BoundInferenceClient;
    esClient: ElasticsearchClient;
    logger: Logger;
    start?: number;
    end?: number;
    signal: AbortSignal;
    prompt: string;
    tools?: TTools;
  } & (TTools extends Record<string, ToolDefinition> ? { toolCallbacks: TToolCallbacks } : {})
): Promise<
  ReasoningPromptResponseOf<
    typeof EsqlPrompt,
    PromptOptions<typeof EsqlPrompt> & {
      tools: TTools & EsqlReasoningToolOptions['tools'];
      stream: false;
    },
    TToolCallbacks & EsqlReasoningToolCallbacks
  >
>;

export async function executeAsEsqlAgent({
  inferenceClient,
  esClient,
  start,
  end,
  signal,
  prompt,
  tools,
  toolCallbacks,
  logger,
}: {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  start?: number;
  end?: number;
  signal: AbortSignal;
  prompt: string;
  tools?: Record<string, ToolDefinition>;
  toolCallbacks?: ToolCallbacksOf<ToolOptions>;
  logger: Logger;
}): Promise<EsqlReasoningPromptResponse> {
  const docBase = await loadEsqlDocBase();

  const assistantReply = await executeAsReasoningAgent({
    inferenceClient,
    prompt: EsqlPrompt,
    abortSignal: signal,
    tools,
    toolCallbacks: {
      ...toolCallbacks,
      list_datasets: createListDatasetsToolCallback({ esClient }),
      describe_dataset: createDescribeDatasetToolCallback({ esClient, start, end }),
      get_documentation: createGetDocumentationToolCallback({ docBase }),
      run_queries: createRunQueriesToolCallback({ esClient }),
      validate_queries: createValidateQueriesToolCallback({ esClient }),
    },
    input: {
      prompt,
      esql_system_prompt: docBase.getSystemMessage(),
    },
  });

  return assistantReply;
}
