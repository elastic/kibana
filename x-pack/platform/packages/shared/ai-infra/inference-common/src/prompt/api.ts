/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Overwrite, Assign } from 'utility-types';
import {
  ChatCompleteOptions,
  Message,
  ToolChoice,
  ToolDefinition,
  ToolOptions,
} from '../chat_complete';
import { Prompt, ToolOptionsOfPrompt } from './types';
import {
  ChatCompleteAPIResponse,
  ChatCompleteCompositeResponse,
  ChatCompleteResponse,
  ChatCompleteStreamResponse,
} from '../chat_complete/api';

type PromptChatCompleteOptions = Omit<ChatCompleteOptions, 'messages' | 'system'>;

/**
 * Options for the {@link PromptAPI}
 */
export interface PromptOptions<TPrompt extends Prompt = Prompt> extends PromptChatCompleteOptions {
  prompt: TPrompt;
  input: z.input<TPrompt['input']>;
  prevMessages?: Message[];
}

/**
 * Composite response type from the {@link PromptAPI},
 * which can be either an observable or a promise depending on
 * whether API was called with stream mode enabled or not.
 */
export type PromptCompositeResponse<TPromptOptions extends PromptOptions = PromptOptions> =
  ChatCompleteCompositeResponse<
    Omit<TPromptOptions, 'tools' | 'toolChoice'> &
      MergeToolOptions<ToolOptionsOfPrompt<TPromptOptions['prompt']>, TPromptOptions>
  >;

type MergeToolOptions<TLeft extends ToolOptions, TRight extends ToolOptions> = Overwrite<
  Pick<TLeft, 'tools' | 'toolChoice'>,
  {
    toolChoice: TRight['toolChoice'] extends ToolChoice
      ? TRight['toolChoice']
      : TLeft['toolChoice'];
    tools: TLeft['tools'] extends Record<string, ToolDefinition>
      ? TRight['tools'] extends Record<string, ToolDefinition>
        ? Assign<TLeft['tools'], TRight['tools']>
        : TLeft['tools']
      : TRight['tools'] extends Record<string, ToolDefinition>
      ? TRight['tools']
      : {};
  }
>;

type ChatCompleteOptionsOfPromptOptions<TPromptOptions extends PromptOptions = PromptOptions> = {
  messages: Message[];
} & Omit<TPromptOptions, 'tools' | 'toolChoice'> &
  MergeToolOptions<ToolOptionsOfPrompt<TPromptOptions['prompt']>, TPromptOptions>;

export type PromptResponseOf<
  TPrompt extends Prompt,
  TStream extends boolean = false
> = PromptCompositeResponse<Overwrite<PromptOptions<TPrompt>, { stream: TStream }>>;

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

export type PromptAPI = <TPrompt extends Prompt, TPromptOptions extends PromptOptions>(
  options: PromptOptions<TPrompt> & TPromptOptions
) => PromptAPIResponse<TPromptOptions>;
