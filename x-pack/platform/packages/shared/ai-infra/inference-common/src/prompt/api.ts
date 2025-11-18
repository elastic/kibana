/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { Assign } from 'utility-types';
import type { ChatCompleteOptions, Message } from '../chat_complete';
import type {
  ChatCompleteAPIResponse,
  ChatCompleteCompositeResponse,
  ChatCompleteResponse,
  ChatCompleteStreamResponse,
} from '../chat_complete/api';
import type { Prompt, ToolOptionsOfPrompt } from './types';

type PromptChatCompleteOptions = Omit<ChatCompleteOptions, 'messages' | 'system' | 'tools'>;

/**
 * Options for the {@link PromptAPI}
 */
export interface PromptOptions<TPrompt extends Prompt = Prompt> extends PromptChatCompleteOptions {
  prompt: TPrompt;
  input: z.input<TPrompt['input']>;
  prevMessages?: Message[];
}

/**
 * Returns the chat complete options shape for the given prompt options.
 * The main difference is that it will convert the tools specified in the prompt
 * versions to a top-level `tools` type.
 */
export type ChatCompleteOptionsOfPromptOptions<
  TPromptOptions extends PromptOptions = PromptOptions
> = {
  messages: Message[];
} & TPromptOptions &
  ToolOptionsOfPrompt<TPromptOptions['prompt']>;

/**
 * Composite response type from the {@link PromptAPI},
 * which can be either an observable or a promise depending on
 * whether API was called with stream mode enabled or not.
 */
export type PromptCompositeResponse<TPromptOptions extends PromptOptions = PromptOptions> =
  ChatCompleteCompositeResponse<ChatCompleteOptionsOfPromptOptions<TPromptOptions>>;

/**
 * Returns the prompt response shape for the given {@link Prompt}
 */
export type PromptResponseOf<
  TPrompt extends Prompt,
  TStream extends boolean = false
> = PromptCompositeResponse<Assign<PromptOptions<TPrompt>, { stream: TStream }>>;

export type PromptAPIResponse<TPromptOptions extends PromptOptions = PromptOptions> =
  ChatCompleteAPIResponse<ChatCompleteOptionsOfPromptOptions<TPromptOptions>>;

/**
 * Response from the {@link PromptAPI} when streaming is not enabled.
 */
export type PromptResponse<TPromptOptions extends PromptOptions = PromptOptions> =
  ChatCompleteResponse<ChatCompleteOptionsOfPromptOptions<TPromptOptions>>;

/**
 * Response from the {@link PromptAPI} in streaming mode.
 */
export type PromptStreamResponse<TPromptOptions extends PromptOptions = PromptOptions> =
  ChatCompleteStreamResponse<ChatCompleteOptionsOfPromptOptions<TPromptOptions>>;

/**
 * Type for the `prompt` API
 */
export type PromptAPI = <TPrompt extends Prompt, TPromptOptions extends PromptOptions<Prompt>>(
  options: PromptOptions<TPrompt> & TPromptOptions
) => PromptAPIResponse<TPromptOptions>;
