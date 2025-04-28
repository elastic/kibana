/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Optional } from 'utility-types';
import {
  ChatCompleteOptions,
  ChatCompleteResponse,
  ChatCompleteStreamResponse,
} from '../chat_complete';
import { Prompt, ToolOptionsOfPrompt } from './types';

/**
 * Generate a response with the LLM based on a structured Prompt.
 *
 * @example
 * ```ts
 *
 * ...
 * ```
 */
export type PromptAPI = <
  TPrompt extends Prompt = Prompt,
  TOtherOptions extends PromptOptions<TPrompt> = PromptOptions<TPrompt>
>(
  options: TOtherOptions & { prompt: TPrompt }
) => PromptCompositeResponse<{ prompt: TPrompt } & TOtherOptions>;

/**
 * Options for the {@link PromptAPI}
 */
export interface PromptOptions<TPrompt extends Prompt = Prompt>
  extends Optional<
    Omit<ChatCompleteOptions, 'messages' | 'system' | 'tools' | 'toolChoice' | 'stream'>,
    'temperature'
  > {
  prompt: TPrompt;
  input: z.input<TPrompt['input']>;
  stream?: boolean;
}

/**
 * Composite response type from the {@link PromptAPI},
 * which can be either an observable or a promise depending on
 * whether API was called with stream mode enabled or not.
 */
export type PromptCompositeResponse<TPromptOptions extends PromptOptions = PromptOptions> =
  TPromptOptions['stream'] extends true
    ? PromptStreamResponse<TPromptOptions['prompt']>
    : Promise<PromptResponse<TPromptOptions['prompt']>>;

/**
 * Response from the {@link PromptAPI} when streaming is not enabled.
 */
export type PromptResponse<TPrompt extends Prompt = Prompt> = ChatCompleteResponse<
  ToolOptionsOfPrompt<TPrompt>
>;

/**
 * Response from the {@link PromptAPI} in streaming mode.
 */
export type PromptStreamResponse<TPrompt extends Prompt = Prompt> = ChatCompleteStreamResponse<
  ToolOptionsOfPrompt<TPrompt>
>;
