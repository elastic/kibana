/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context, Span } from '@opentelemetry/api';

export enum GenAISemanticConventions {
  GenAIUsageCost = 'gen_ai.usage.cost',
  GenAIUsageInputTokens = 'gen_ai.usage.input_tokens',
  GenAIUsageCacheReadInputTokens = 'gen_ai.usage.cache_read.input_tokens',
  GenAIUsageOutputTokens = 'gen_ai.usage.output_tokens',
  GenAIOperationName = 'gen_ai.operation.name',
  GenAIResponseModel = 'gen_ai.response.model',
  GenAIRequestModel = 'gen_ai.request.model',
  GenAIProviderName = 'gen_ai.provider.name',
  GenAIOutputType = 'gen_ai.output.type',
  GenAIToolCallId = 'gen_ai.tool.call.id',
  GenAIToolCallArguments = 'gen_ai.tool.call.arguments',
  GenAIToolCallResult = 'gen_ai.tool.call.result',
  GenAIToolName = 'gen_ai.tool.name',
  GenAIToolDescription = 'gen_ai.tool.description',
  GenAIToolType = 'gen_ai.tool.type',
  GenAIToolDefinitions = 'gen_ai.tool.definitions',

  /** v1.37.0+ structured attributes — replace per-message events */
  GenAIInputMessages = 'gen_ai.input.messages',
  GenAIOutputMessages = 'gen_ai.output.messages',
  GenAISystemInstructions = 'gen_ai.system_instructions',

  GenAIAgentId = 'gen_ai.agent.id',
  GenAIAgentName = 'gen_ai.agent.name',
  GenAIConversationId = 'gen_ai.conversation.id',
  GenAIWorkflowName = 'gen_ai.workflow.name',
}

export enum ElasticGenAIAttributes {
  InferenceSpanKind = 'elastic.inference.span.kind',
  ToolChoice = 'elastic.llm.toolChoice',
}

export interface GenAISemConvAttributes {
  [GenAISemanticConventions.GenAIUsageCost]?: number;
  [GenAISemanticConventions.GenAIUsageInputTokens]?: number;
  [GenAISemanticConventions.GenAIUsageCacheReadInputTokens]?: number;
  [GenAISemanticConventions.GenAIUsageOutputTokens]?: number;
  [GenAISemanticConventions.GenAIOperationName]?:
    | 'chat'
    | 'execute_tool'
    | 'invoke_agent'
    | 'invoke_workflow';
  [GenAISemanticConventions.GenAIRequestModel]?: string;
  [GenAISemanticConventions.GenAIResponseModel]?: string;
  [GenAISemanticConventions.GenAIProviderName]?: string;
  'error.type'?: string;
  [GenAISemanticConventions.GenAIOutputType]?: 'text' | 'image' | 'json';
  [GenAISemanticConventions.GenAIToolCallId]?: string;
  [GenAISemanticConventions.GenAIToolCallArguments]?: string;
  [GenAISemanticConventions.GenAIToolCallResult]?: string;
  [GenAISemanticConventions.GenAIToolName]?: string;
  [GenAISemanticConventions.GenAIToolDescription]?: string;
  [GenAISemanticConventions.GenAIToolType]?: string;
  [GenAISemanticConventions.GenAIToolDefinitions]?: string;
  [GenAISemanticConventions.GenAIInputMessages]?: string;
  [GenAISemanticConventions.GenAIOutputMessages]?: string;
  [GenAISemanticConventions.GenAISystemInstructions]?: string;
  [GenAISemanticConventions.GenAIAgentId]?: string;
  [GenAISemanticConventions.GenAIAgentName]?: string;
  [GenAISemanticConventions.GenAIConversationId]?: string;
  [GenAISemanticConventions.GenAIWorkflowName]?: string;
  [ElasticGenAIAttributes.InferenceSpanKind]?: 'CHAIN' | 'AGENT' | 'LLM' | 'TOOL';
  [ElasticGenAIAttributes.ToolChoice]?: string;
}

/**
 * OTel GenAI semconv v1.37.0+ message schema using `parts[]`.
 */
export interface GenAITextPart {
  type: 'text';
  content: string;
}

export interface GenAIToolCallPart {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: string;
}

export interface GenAIToolCallResponsePart {
  type: 'tool_call_response';
  id: string;
  response: string;
}

export type GenAIMessagePart = GenAITextPart | GenAIToolCallPart | GenAIToolCallResponsePart;

export interface GenAIInputMessage {
  role: 'user' | 'assistant' | 'tool';
  parts: GenAIMessagePart[];
}

export interface GenAIOutputMessage {
  role: 'assistant';
  finish_reason: 'stop' | 'tool_calls';
  parts: GenAIMessagePart[];
}

export interface InferenceSpanInit {
  span: Span;
  context: Context;
}
