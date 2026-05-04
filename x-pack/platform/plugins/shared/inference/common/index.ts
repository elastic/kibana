/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { correctCommonEsqlMistakes, splitIntoCommands } from './tasks/nl_to_esql';
export { generateFakeToolCallId } from './utils/generate_fake_tool_call_id';
export { createOutputApi } from './output';
export type {
  ChatCompleteRequestBody,
  GetConnectorsResponseBody,
  PromptRequestBody,
} from './http_apis';

export { createRestClient } from './rest/create_client';

export {
  AiPromptStepTypeId,
  AiPromptStepCommonDefinition,
  AiPromptOutputSchema,
  getStructuredOutputSchema,
  AiPromptMetadataSchema,
  AiPromptConfigSchema,
  AiPromptInputSchema,
  AiPromptOutputSchemaFull,
  AiPromptStepConfigSchema,
  AiPromptStepInputSchema,
  AiPromptStepOutputSchema,
  AiSummarizeStepTypeId,
  AiSummarizeStepCommonDefinition,
  AiSummarizeConfigSchema,
  AiSummarizeInputSchema,
  AiSummarizeOutputSchema,
  AiSummarizeStepConfigSchema,
  AiSummarizeStepInputSchema,
  AiSummarizeStepOutputSchema,
  AiClassifyStepTypeId,
  AiClassifyStepCommonDefinition,
  buildStructuredOutputSchema,
  AiClassifyConfigSchema,
  AiClassifyInputSchema,
  AiClassifyOutputSchema,
  AiClassifyStepConfigSchema,
  AiClassifyStepInputSchema,
  AiClassifyStepOutputSchema,
} from './workflow_steps';
