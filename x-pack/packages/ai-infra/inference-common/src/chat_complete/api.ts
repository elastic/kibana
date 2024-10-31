/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ToolOptions } from './tools';
import type { Message } from './messages';
import type { ChatCompletionEvent } from './events';

/**
 * Request a completion from the LLM based on a prompt or conversation.
 *
 * @example using the API to get an event observable.
 * ```ts
 * const events$ = chatComplete({
 *   connectorId: 'my-connector',
 *   system: "You are a helpful assistant",
 *   messages: [
 *      { role: MessageRole.User, content: "First question?"},
 *      { role: MessageRole.Assistant, content: "Some answer"},
 *      { role: MessageRole.User, content: "Another question?"},
 *   ]
 * });
 */
export type ChatCompleteAPI = <TToolOptions extends ToolOptions = ToolOptions>(
  options: ChatCompleteOptions<TToolOptions>
) => ChatCompletionResponse<TToolOptions>;

/**
 * Options used to call the {@link ChatCompleteAPI}
 */
export type ChatCompleteOptions<TToolOptions extends ToolOptions = ToolOptions> = {
  /**
   * The ID of the connector to use.
   * Must be a genAI compatible connector, or an error will be thrown.
   */
  connectorId: string;
  /**
   * Optional system message for the LLM.
   */
  system?: string;
  /**
   * The list of messages for the current conversation
   */
  messages: Message[];
  /**
   * Function calling mode, defaults to "native".
   */
  functionCalling?: FunctionCallingMode;
} & TToolOptions;

/**
 * Response from the {@link ChatCompleteAPI}.
 *
 * Observable of {@link ChatCompletionEvent}
 */
export type ChatCompletionResponse<TToolOptions extends ToolOptions = ToolOptions> = Observable<
  ChatCompletionEvent<TToolOptions>
>;

/**
 * Define the function calling mode when using inference APIs.
 * - native will use the LLM's native function calling (requires the LLM to have native support)
 * - simulated: will emulate function calling with function calling instructions
 */
export type FunctionCallingMode = 'native' | 'simulated';
