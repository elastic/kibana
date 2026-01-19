/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Overwrite } from 'utility-types';
import type { Observable } from 'rxjs';
import type { ToolChoiceType, ToolOptions } from './tools';
import type { Message } from './messages';
import type { ChatCompletionEvent, ChatCompletionTokenCount } from './events';
import type { ChatCompleteMetadata } from './metadata';
import type { ToolCallOfToolOptions } from './tools_of';

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

export interface DefaultChatCompleteOptions {
  stream: false;
  tools: {};
  toolChoice: ToolChoiceType.auto;
}

type ChatCompleteCompositeResponseOptions = Pick<
  ChatCompleteOptions,
  'stream' | 'tools' | 'toolChoice'
>;

type ChatCompleteResponseOptions = Pick<ChatCompleteOptions, 'tools' | 'toolChoice'>;

export type ChatCompleteAPIResponse<TOptions extends ChatCompleteOptions = ChatCompleteOptions> =
  ChatCompleteCompositeResponse<Overwrite<DefaultChatCompleteOptions, TOptions>>;

export type ChatCompleteAPI = <TOptions extends ChatCompleteOptions>(
  options: TOptions
) => ChatCompleteAPIResponse<TOptions>;

/**
 * Options used to call the {@link ChatCompleteAPI}
 */
export type ChatCompleteOptions = {
  /**
   * The ID of the connector to use.
   * Must be an inference connector, or an error will be thrown.
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
  /**
   * The maximum amount of times to retry in case of error returned from the provider.
   *
   * Defaults to 3.
   */
  maxRetries?: number;
  /**
   * Optional configuration for the retry mechanism.
   *
   * Note that defaults are very fine, so only use this if you really have a reason to do so.
   */
  retryConfiguration?: ChatCompleteRetryConfiguration;
  /**
   * Set to true to enable streaming, which will change the API response type from
   * a single {@link ChatCompleteResponse} promise
   * to a {@link ChatCompleteStreamResponse} event observable.
   *
   * Defaults to false.
   */
  stream?: boolean;
  /**
   * The timeout for the chat completion request.
   */
  timeout?: number;
} & ToolOptions;

export interface ChatCompleteRetryConfiguration {
  /**
   * Defines the strategy for error retry
   *
   * Either one of
   * - all: will retry all errors
   * - auto: will only retry errors that could be recoverable (e.g rate limit, connectivity)
   * Of a custom function to manually handle filtering
   *
   * Defaults to "auto"
   */
  retryOn?: 'all' | 'auto' | ((err: Error) => boolean);
  /**
   * The initial delay for incremental backoff, in ms.
   *
   * Defaults to 1000.
   */
  initialDelay?: number;
  /**
   * The backoff exponential multiplier.
   *
   * Defaults to 2.
   */
  backoffMultiplier?: number;
}

/**
 * Composite response type from the {@link ChatCompleteAPI},
 * which can be either an observable or a promise depending on
 * whether API was called with stream mode enabled or not.
 */
export type ChatCompleteCompositeResponse<
  TOptions extends ChatCompleteCompositeResponseOptions = ChatCompleteCompositeResponseOptions
> =
  | (true extends TOptions['stream'] ? ChatCompleteStreamResponse<TOptions> : never)
  | (false extends TOptions['stream'] ? Promise<ChatCompleteResponse<TOptions>> : never);

/**
 * Response from the {@link ChatCompleteAPI} when streaming is enabled.
 *
 * Observable of {@link ChatCompletionEvent}
 */
export type ChatCompleteStreamResponse<
  TOptions extends ChatCompleteResponseOptions = ChatCompleteResponseOptions
> = Observable<ChatCompletionEvent<TOptions>>;

/**
 * Response from the {@link ChatCompleteAPI} when streaming is not enabled.
 */
export interface ChatCompleteResponse<
  TOptions extends ChatCompleteResponseOptions = ChatCompleteResponseOptions
> {
  /**
   * The text content of the LLM response.
   */
  content: string;
  /**
   * Optional refusal reason returned by the model when content is filtered.
   */
  refusal?: string;
  /**
   * The eventual tool calls performed by the LLM.
   */
  toolCalls: ToolCallOfToolOptions<TOptions>[];
  /**
   * Token counts
   */
  tokens?: ChatCompletionTokenCount;
  /**
   * Model effectively used, as specified by the response
   */
  model?: string;
}

/**
 * Define the function calling mode when using inference APIs.
 * - "native": will use the LLM's native function calling (requires the LLM to have native support)
 * - "simulated": will emulate function calling with function calling instructions
 * - "auto": will use "native" for providers we know are supporting native function call, "simulated" otherwise
 */
export type FunctionCallingMode = 'native' | 'simulated' | 'auto';
