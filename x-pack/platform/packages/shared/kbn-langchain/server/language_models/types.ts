/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type OpenAI from 'openai';

export interface InvokeAIActionParamsSchema {
  messages: Array<{
    role: string;
    content:
      | string
      | OpenAI.ChatCompletionContentPart[]
      | Array<OpenAI.ChatCompletionContentPartText | OpenAI.ChatCompletionContentPartRefusal>;
    name?: string;
    function_call?: {
      arguments: string;
      name: string;
    } | null;
    tool_calls?: Array<{
      id: string;

      function: {
        arguments: string;
        name: string;
      };

      type: string;
    }>;
    tool_call_id?: string;
  }>;
  model?: OpenAI.ChatCompletionCreateParamsNonStreaming['model'];
  n?: OpenAI.ChatCompletionCreateParamsNonStreaming['n'];
  stop?: OpenAI.ChatCompletionCreateParamsNonStreaming['stop'];
  temperature?: OpenAI.ChatCompletionCreateParamsNonStreaming['temperature'];
  functions?: OpenAI.ChatCompletionCreateParamsNonStreaming['functions'];
  signal?: AbortSignal;
  timeout?: number;
  telemetryMetadata?: TelemetryMetadata;
}
export interface RunActionParamsSchema {
  body: string;
  signal?: AbortSignal;
  timeout?: number;
}
export interface InferenceChatCompleteParamsSchema {
  body: InvokeAIActionParamsSchema;
}

export interface TraceOptions {
  evaluationId?: string;
  exampleId?: string;
  projectName?: string;
  runName?: string;
  tags?: string[];
  tracers?: LangChainTracer[];
}
