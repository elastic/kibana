/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundInferenceClient,
  Message,
  MessageOf,
  Prompt,
  PromptOptions,
  PromptResponse,
  ToolCallbacksOfToolOptions,
  ToolOptionsOfPrompt,
} from '@kbn/inference-common';

export interface ReasoningPromptOptions {
  inferenceClient: BoundInferenceClient;
  maxSteps?: number;
  prevMessages?: undefined;
}

export type ReasoningPromptResponseOf<
  TPrompt extends Prompt = Prompt,
  TPromptOptions extends PromptOptions<TPrompt> = PromptOptions<TPrompt>,
  TToolCallbacks extends ToolCallbacksOfToolOptions<
    ToolOptionsOfPrompt<TPrompt>
  > = ToolCallbacksOfToolOptions<ToolOptionsOfPrompt<TPrompt>>
> = PromptResponse<TPromptOptions> & {
  input: Array<
    MessageOf<
      ToolOptionsOfPrompt<TPrompt>,
      {
        [key in keyof TToolCallbacks]: Awaited<ReturnType<TToolCallbacks[key]>>['response'];
      }
    >
  >;
};

export type ReasoningPromptResponse = PromptResponse & { input: Message[] };
