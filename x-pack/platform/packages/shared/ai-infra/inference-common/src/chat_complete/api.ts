/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ToolCallsOf, ToolOptions } from './tools';
import type { Message } from './messages';
import type { ChatCompletionEvent, ChatCompletionTokenCount } from './events';
import type { ChatCompleteMetadata } from './metadata';

/**
 * Request a completion from the LLM based on a prompt or conversation.
 *
 * By default, The complete LLM response will be returned as a promise.
 *
 * @example using the API in default mode to get promise of the LLM response.
 * ```ts
 * const response = await chatComplete({
 *   connectorId: 'my-connector',
 *   system: "You are a helpful assistant",
 *   messages: [
 *      { role: MessageRole.User, content: "Some question?"},
 *   ]
 * });
 *
 * const { content, tokens, toolCalls } = response;
 * ```
 *
 * Use `stream: true` to return an observable returning the full set
 * of events in real time.
 *
 * @example using the API in stream mode to get an event observable.
 * ```ts
 * const events$ = chatComplete({
 *   stream: true,
 *   connectorId: 'my-connector',
 *   system: "You are a helpful assistant",
 *   messages: [
 *      { role: MessageRole.User, content: "First question?"},
 *      { role: MessageRole.Assistant, content: "Some answer"},
 *      { role: MessageRole.User, content: "Another question?"},
 *   ]
 * });
 *
 * // using the observable
 * events$.pipe(withoutTokenCountEvents()).subscribe((event) => {
 *  if (isChatCompletionChunkEvent(event)) {
 *     // do something with the chunk event
 *   } else {
 *     // do something with the message event
 *   }
 * });
 * ```
 */
export type ChatCompleteAPI = <
  TToolOptions extends ToolOptions = ToolOptions,
  TStream extends boolean = false
>(
  options: ChatCompleteOptions<TToolOptions, TStream>
) => ChatCompleteCompositeResponse<TToolOptions, TStream>;

/**
 * Options used to call the {@link ChatCompleteAPI}
 */
export type ChatCompleteOptions<
  TToolOptions extends ToolOptions = ToolOptions,
  TStream extends boolean = false
> = {
  /**
   * The ID of the connector to use.
   * Must be an inference connector, or an error will be thrown.
   */
  connectorId: string;
  /**
   * Set to true to enable streaming, which will change the API response type from
   * a single {@link ChatCompleteResponse} promise
   * to a {@link ChatCompleteStreamResponse} event observable.
   *
   * Defaults to false.
   */
  stream?: TStream;
  /**
   * Optional system message for the LLM.
   */
  system?: string;
  /**
   * The list of messages for the current conversation
   */
  messages: Message[];
  /**
   * LLM temperature. All models support the 0-1 range (some supports more).
   * Defaults to 0;
   */
  temperature?: number;
  /**
   * The model name identifier to use. Can be defined to use another model than the
   * default one, when using connectors / providers exposing multiple models.
   *
   * Defaults to the default model as defined by the used connector.
   */
  modelName?: string;
  /**
   * Function calling mode, defaults to "auto".
   */
  functionCalling?: FunctionCallingMode;
  /**
   * Optional signal that can be used to forcefully abort the request.
   */
  abortSignal?: AbortSignal;
  /**
   * Optional metadata related to call execution.
   */
  metadata?: ChatCompleteMetadata;
} & TToolOptions;

/**
 * Composite response type from the {@link ChatCompleteAPI},
 * which can be either an observable or a promise depending on
 * whether API was called with stream mode enabled or not.
 */
export type ChatCompleteCompositeResponse<
  TToolOptions extends ToolOptions = ToolOptions,
  TStream extends boolean = false
> = TStream extends true
  ? ChatCompleteStreamResponse<TToolOptions>
  : Promise<ChatCompleteResponse<TToolOptions>>;

/**
 * Response from the {@link ChatCompleteAPI} when streaming is enabled.
 *
 * Observable of {@link ChatCompletionEvent}
 */
export type ChatCompleteStreamResponse<TToolOptions extends ToolOptions = ToolOptions> = Observable<
  ChatCompletionEvent<TToolOptions>
>;

/**
 * Response from the {@link ChatCompleteAPI} when streaming is not enabled.
 */
export interface ChatCompleteResponse<TToolOptions extends ToolOptions = ToolOptions> {
  /**
   * The text content of the LLM response.
   */
  content: string;
  /**
   * The eventual tool calls performed by the LLM.
   */
  toolCalls: ToolCallsOf<TToolOptions>['toolCalls'];
  /**
   * Token counts
   */
  tokens?: ChatCompletionTokenCount;
}

/**
 * Define the function calling mode when using inference APIs.
 * - "native": will use the LLM's native function calling (requires the LLM to have native support)
 * - "simulated": will emulate function calling with function calling instructions
 * - "auto": will use "native" for providers we know are supporting native function call, "simulated" otherwise
 */
export type FunctionCallingMode = 'native' | 'simulated' | 'auto';
