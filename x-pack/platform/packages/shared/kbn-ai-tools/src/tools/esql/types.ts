/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReasoningPromptResponseOf } from '@kbn/inference-prompt-utils';
import { MessageOf, ToolCallsOf, ToolMessageOf, ToolOptionsOfPrompt } from '@kbn/inference-common';
import { EsqlPrompt } from './prompt';
import { RunQueriesToolCallResponse } from './create_run_queries_tool_callback';
import { ValidateQueriesToolCallResponse } from './create_validate_queries_tool_callbacks';
import { ListDatasetsToolCallResponse } from './create_list_datasets_tool_callback';
import { GetDocumentationToolCallResponse } from './create_get_documentation_callback';
import { DescribeDatasetToolCallResponse } from './create_describe_dataset_tool_callback';

export type EsqlReasoningPromptResponse = ReasoningPromptResponseOf<typeof EsqlPrompt>;

export type EsqlReasoningToolOptions = Pick<ToolOptionsOfPrompt<typeof EsqlPrompt>, 'tools'>;

export interface EsqlReasoningToolResponses {
  describe_dataset: DescribeDatasetToolCallResponse;
  get_documentation: GetDocumentationToolCallResponse;
  list_datasets: ListDatasetsToolCallResponse;
  run_queries: RunQueriesToolCallResponse;
  validate_queries: ValidateQueriesToolCallResponse;
}

export type EsqlReasoningMessage = MessageOf<EsqlReasoningToolOptions, EsqlReasoningToolResponses>;

export type EsqlReasoningToolCallbacks = {
  [key in keyof EsqlReasoningToolResponses]: (
    toolCall: ToolCallsOf<{
      tools: Pick<EsqlReasoningToolOptions['tools'], key>;
    }>['toolCalls'][number]
  ) => Promise<EsqlReasoningToolResponses[key]>;
};

export type EsqlReasoningToolMessage = ToolMessageOf<
  EsqlReasoningToolOptions,
  {
    describe_dataset: DescribeDatasetToolCallResponse;
    get_documentation: GetDocumentationToolCallResponse;
    list_datasets: ListDatasetsToolCallResponse;
    run_queries: RunQueriesToolCallResponse;
    validate_queries: ValidateQueriesToolCallResponse;
  }
>;

export type EsqlReasoningTaskListDatasetsToolMessage = Extract<
  EsqlReasoningToolMessage,
  { name: 'list_datasets' }
>;

export type EsqlReasoningTaskDescribeDatasetToolMessage = Extract<
  EsqlReasoningToolMessage,
  { name: 'describe_dataset' }
>;

export type EsqlReasoningTaskGetDocumentationToolMessage = Extract<
  EsqlReasoningToolMessage,
  { name: 'get_documentation' }
>;

export type EsqlReasoningTaskRunQueriesToolMessage = Extract<
  EsqlReasoningToolMessage,
  { name: 'run_queries' }
>;

export type EsqlReasoningValidateQueriesToolMessage = Extract<
  EsqlReasoningToolMessage,
  { name: 'validate_queries' }
>;
