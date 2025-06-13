/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, Span } from '@opentelemetry/api';

export enum GenAISemanticConventions {
  GenAIUsageCost = 'gen_ai.usage.cost',
  GenAIUsageInputTokens = 'gen_ai.usage.input_tokens',
  GenAIUsageCachedInputTokens = 'gen_ai.usage.cached_input_tokens',
  GenAIUsageOutputTokens = 'gen_ai.usage.output_tokens',
  GenAIOperationName = 'gen_ai.operation.name',
  GenAIResponseModel = 'gen_ai.response.model',
  GenAISystem = 'gen_ai.system',
  GenAIOutputType = 'gen_ai.output.type',
  GenAIToolCallId = 'gen_ai.tool.call.id',
  GenAIToolName = 'gen_ai.tool.name',
  GenAISystemMessage = 'gen_ai.system.message',
  GenAIUserMessage = 'gen_ai.user.message',
  GenAIAssistantMessage = 'gen_ai.assistant.message',
  GenAIToolMessage = 'gen_ai.tool.message',
  GenAIChoice = 'gen_ai.choice',
}

export enum ElasticGenAIAttributes {
  ToolDescription = 'elastic.tool.description',
  ToolParameters = 'elastic.tool.parameters',
  InferenceSpanKind = 'elastic.inference.span.kind',
  Tools = 'elastic.llm.tools',
  ToolChoice = 'elastic.llm.toolChoice',
}

export interface GenAISemConvAttributes {
  [GenAISemanticConventions.GenAIUsageCost]?: number;
  [GenAISemanticConventions.GenAIUsageInputTokens]?: number;
  [GenAISemanticConventions.GenAIUsageCachedInputTokens]?: number;
  [GenAISemanticConventions.GenAIUsageOutputTokens]?: number;
  [GenAISemanticConventions.GenAIOperationName]?: 'chat' | 'execute_tool';
  [GenAISemanticConventions.GenAIResponseModel]?: string;
  [GenAISemanticConventions.GenAISystem]?: string;
  'error.type'?: string;
  [GenAISemanticConventions.GenAIOutputType]?: 'text' | 'image' | 'json';
  [GenAISemanticConventions.GenAIToolCallId]?: string;
  [GenAISemanticConventions.GenAIToolName]?: string;
  'input.value'?: any;
  'output.value'?: any;
  [ElasticGenAIAttributes.InferenceSpanKind]?: 'CHAIN' | 'LLM' | 'TOOL';
  [ElasticGenAIAttributes.ToolDescription]?: string;
  [ElasticGenAIAttributes.ToolParameters]?: string;
  [ElasticGenAIAttributes.Tools]?: string;
  [ElasticGenAIAttributes.ToolChoice]?: string;
}

interface GenAISemConvEvent<
  TName extends string,
  TBody extends {},
  TAttributeName extends keyof GenAISemConvAttributes
> {
  name: TName;
  body: TBody;
  attributes?: {
    [key in TAttributeName]: GenAISemConvAttributes[TAttributeName];
  };
}

export type SystemMessageEvent = GenAISemConvEvent<
  GenAISemanticConventions.GenAISystemMessage,
  {
    role: 'system';
    content: string;
  },
  GenAISemanticConventions.GenAISystem
>;

export type UserMessageEvent = GenAISemConvEvent<
  GenAISemanticConventions.GenAIUserMessage,
  {
    role: 'user';
    content: string;
  },
  GenAISemanticConventions.GenAISystem
>;

export type AssistantMessageEvent = GenAISemConvEvent<
  GenAISemanticConventions.GenAIAssistantMessage,
  {
    content?: unknown;
    role: 'assistant';
    tool_calls?: Array<{
      function: {
        arguments: string;
        name: string;
      };
      id: string;
      type: 'function';
    }>;
  },
  GenAISemanticConventions.GenAISystem
>;

export type ToolMessageEvent = GenAISemConvEvent<
  GenAISemanticConventions.GenAIToolMessage,
  {
    content?: string;
    id: string;
    role: 'tool' | 'function';
  },
  GenAISemanticConventions.GenAISystem
>;

export type ChoiceEvent = GenAISemConvEvent<
  GenAISemanticConventions.GenAIChoice,
  {
    index: number;
    finish_reason: 'stop' | 'tool_calls';
    message: {
      content?: string | null;
      role: 'assistant';
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: string;
        };
        id: string;
        type: 'function';
      }>;
    };
  },
  GenAISemanticConventions.GenAISystem
>;

export type MessageEvent =
  | SystemMessageEvent
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolMessageEvent
  | ChoiceEvent;

export interface InferenceSpanInit {
  span: Span;
  context: Context;
}
