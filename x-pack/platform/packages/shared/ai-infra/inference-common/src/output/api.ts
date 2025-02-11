/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import {
  Message,
  FunctionCallingMode,
  FromToolSchema,
  ToolSchema,
  ChatCompleteMetadata,
} from '../chat_complete';
import { Output, OutputEvent } from './events';

/**
 * Generate a response with the LLM for a prompt, optionally based on a schema.
 *
 * @example
 * ```ts
 * // schema must be defined as full const or using the `satisfies ToolSchema` modifier for TS type inference to work
 * const mySchema = {
 *   type: 'object',
 *   properties: {
 *     animals: {
 *       description: 'the list of animals that are mentioned in the provided article',
 *       type: 'array',
 *       items: {
 *         type: 'string',
 *       },
 *     },
 *   },
 * } as const;
 *
 * const response = outputApi({
 *   id: 'extract_from_article',
 *   connectorId: 'my-connector connector',
 *   schema: mySchema,
 *   input: `
 *     Please find all the animals that are mentioned in the following document:
 *     ## Document¬
 *     ${theDoc}
 *   `,
 * });
 *
 * // output is properly typed from the provided schema
 * const { animals } = response.output;
 * ```
 */
export type OutputAPI = <
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
  TStream extends boolean = false
>(
  options: OutputOptions<TId, TOutputSchema, TStream>
) => OutputCompositeResponse<TId, TOutputSchema, TStream>;

/**
 * Options for the {@link OutputAPI}
 */
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
   * Must be an inference connector, or an error will be thrown.
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
   * The schema the response from the LLM should adhere to.
   */
  schema?: TOutputSchema;
  /**
   * Previous messages in the conversation.
   * If provided, will be passed to the LLM in addition to `input`.
   */
  previousMessages?: Message[];
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
   * Set to true to enable streaming, which will change the API response type from
   * a single promise to an event observable.
   *
   * Defaults to false.
   */
  stream?: TStream;
  /**
   * Optional signal that can be used to forcefully abort the request.
   */
  abortSignal?: AbortSignal;
  /**
   * Optional configuration for retrying the call if an error occurs.
   */
  retry?: {
    /**
     * Whether to retry on validation errors. Can be a number or retries,
     * or a boolean, which means one retry.
     */
    onValidationError?: boolean | number;
  };
  /**
   * Optional metadata related to call execution.
   */
  metadata?: ChatCompleteMetadata;
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
   * The id of the operation, as specified when calling the API.
   */
  id: TId;
  /**
   * The task output, following the schema specified as input.
   */
  output: TOutput;
  /**
   * Potential text content provided by the LLM, if it was provided in addition to the tool call.
   */
  content: string;
}

/**
 * Response from the {@link OutputAPI} in streaming mode.
 *
 * @returns Observable of {@link OutputEvent}
 */
export type OutputStreamResponse<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined
> = Observable<
  OutputEvent<TId, TOutputSchema extends ToolSchema ? FromToolSchema<TOutputSchema> : undefined>
>;
