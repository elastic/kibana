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

export type ReasoningPower = 'low' | 'medium' | 'high';

export interface ReasoningPromptOptions {
  inferenceClient: BoundInferenceClient;
  /**
   * Duration in milliseconds after which no additional reasoning steps will be taken,
   * even if the maximum number of steps has not been reached.
   */
  maxDurationMs?: number;
  /**
   * Maximum number of steps the LLM can take.
   *
   * If not specified, the default value is 10.
   */
  maxSteps?: number;
  prevMessages?: undefined;
  power?: ReasoningPower;
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
