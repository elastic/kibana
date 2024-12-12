/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskEventBase } from '../inference_task';
import type { ToolCallsOf, ToolOptions } from './tools';

/**
 * List possible values of {@link ChatCompletionEvent} types.
 */
export enum ChatCompletionEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ChatCompletionTokenCount = 'chatCompletionTokenCount',
  ChatCompletionMessage = 'chatCompletionMessage',
}

/**
 * Message event, sent only once, after all the chunks were emitted, and containing
 * the whole text content and potential tool calls of the response.
 */
export type ChatCompletionMessageEvent<TToolOptions extends ToolOptions = ToolOptions> =
  InferenceTaskEventBase<ChatCompletionEventType.ChatCompletionMessage> & {
    /**
     * The text content of the LLM response.
     */
    content: string;
    /**
     * The eventual tool calls performed by the LLM.
     */
    toolCalls: ToolCallsOf<TToolOptions>['toolCalls'];
  };

/**
 * Represent a partial tool call present in a chunk event.
 *
 * Note that all properties of the structure, except from the index,
 * are partial and must be aggregated.
 */
export interface ChatCompletionChunkToolCall {
  /**
   * The tool call index (position in the tool call array).
   */
  index: number;
  /**
   * chunk of tool call id.
   */
  toolCallId: string;
  function: {
    /**
     * chunk of tool name.
     */
    name: string;
    /**
     * chunk of tool call arguments.
     */
    arguments: string;
  };
}

/**
 * Chunk event, containing a fragment of the total content,
 * and potentially chunks of tool calls.
 */
export type ChatCompletionChunkEvent =
  InferenceTaskEventBase<ChatCompletionEventType.ChatCompletionChunk> & {
    /**
     * The content chunk
     */
    content: string;
    /**
     * The tool call chunks
     */
    tool_calls: ChatCompletionChunkToolCall[];
  };

/**
 * Token count structure for the chatComplete API.
 */
export interface ChatCompletionTokenCount {
  /**
   * Input token count
   */
  prompt: number;
  /**
   * Output token count
   */
  completion: number;
  /**
   * Total token count
   */
  total: number;
}

/**
 * Token count event, send only once, usually (but not necessarily)
 * before the message event
 */
export type ChatCompletionTokenCountEvent =
  InferenceTaskEventBase<ChatCompletionEventType.ChatCompletionTokenCount> & {
    /**
     * The token count structure
     */
    tokens: ChatCompletionTokenCount;
  };

/**
 * Events emitted from the {@link ChatCompleteResponse} observable
 * returned from the {@link ChatCompleteAPI}.
 *
 * The chatComplete API returns 3 type of events:
 * - {@link ChatCompletionChunkEvent}: message chunk events
 * - {@link ChatCompletionTokenCountEvent}: token count event
 * - {@link ChatCompletionMessageEvent}: message event
 *
 * Note that chunk events can be emitted any amount of times, but token count will be emitted
 * at most once (could not be emitted depending on the underlying connector), and message
 * event will be emitted ex
 *
 */
export type ChatCompletionEvent<TToolOptions extends ToolOptions = ToolOptions> =
  | ChatCompletionChunkEvent
  | ChatCompletionTokenCountEvent
  | ChatCompletionMessageEvent<TToolOptions>;
