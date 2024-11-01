/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { Message, FunctionCallingMode, FromToolSchema, ToolSchema } from '../chat_complete';
import { Output, OutputEvent } from './events';

/**
 * Generate a response with the LLM for a prompt, optionally based on a schema.
 */
export type OutputAPI = <
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
>(
  options: OutputOptions<TId, TOutputSchema, TStream>
) => OutputCompositeResponse<TId, TOutputSchema, TStream>;

export interface OutputOptions<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
> {
  /**
   * The id of the operation.
   */
  id: TId;
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
   * The prompt for the LLM.
   */
  input: string;
  /**
   * The {@link ToolSchema} the response from the LLM should adhere to.
   */
  schema?: TOutputSchema;
  /**
   * Previous messages in the conversation.
   * If provided, will be passed to the LLM in addition to `input`.
   */
  previousMessages?: Message[];
  /**
   * Function calling mode, defaults to "native".
   */
  functionCalling?: FunctionCallingMode;
  /**
   * Set to true to enable streaming, which will change the API response type from
   * a single promise to an event observable.
   *
   * Defaults to false.
   */
  stream?: TStream;
}

/**
 * Composite response type from the {@link OutputAPI},
 * which can be either an observable or a promise depending on
 * whether API was called with stream mode enabled or not.
 */
export type OutputCompositeResponse<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
> = TStream extends true
  ? OutputStreamResponse<TId, TOutputSchema>
  : Promise<
      OutputResponse<
        TId,
        TOutputSchema extends ToolSchema ? FromToolSchema<TOutputSchema> : undefined
      >
    >;

/**
 * Response from the {@link OutputAPI} when streaming is not enabled.
 */
export interface OutputResponse<TId extends string = string, TOutput extends Output = Output> {
  /**
   * The id of the operation, as provided as input
   */
  id: TId;
  /**
   * The task output, following the schema specified as input
   */
  output: TOutput;
  /**
   * Potential text content provided by the LLM,
   * if it was provided in addition to the tool call
   */
  content: string;
}

/**
 * Response from the {@link OutputAPI} in streaming mode.
 *
 * Observable of {@link OutputEvent}
 */
export type OutputStreamResponse<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined
> = Observable<
  OutputEvent<TId, TOutputSchema extends ToolSchema ? FromToolSchema<TOutputSchema> : undefined>
>;
