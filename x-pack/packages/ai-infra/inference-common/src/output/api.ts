/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Message, FunctionCallingMode, FromToolSchema, ToolSchema } from '../chat_complete';
import type { OutputEvent } from './events';

/**
 * Generate a response with the LLM for a prompt, optionally based on a schema.
 *
 * @param {string} id The id of the operation
 * @param {string} options.connectorId The ID of the connector that is to be used.
 * @param {string} options.input The prompt for the LLM.
 * @param {string} options.messages Previous messages in a conversation.
 * @param {ToolSchema} [options.schema] The schema the response from the LLM should adhere to.
 */
export type OutputAPI = <
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined
>(
  id: TId,
  options: {
    connectorId: string;
    system?: string;
    input: string;
    schema?: TOutputSchema;
    previousMessages?: Message[];
    functionCalling?: FunctionCallingMode;
  }
) => OutputResponse<TId, TOutputSchema>;

/**
 * Response from the {@link OutputAPI}.
 *
 * Observable of {@link OutputEvent}
 */
export type OutputResponse<
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined
> = Observable<
  OutputEvent<TId, TOutputSchema extends ToolSchema ? FromToolSchema<TOutputSchema> : undefined>
>;
