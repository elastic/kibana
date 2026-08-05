/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { z, type ZodType } from '@kbn/zod/v4';

/**
 * Definition of a browser API tool that can be provided by consumers
 * and executed in the browser when requested by the LLM.
 */
export interface BrowserApiToolDefinition<TParams = unknown> {
  /**
   * Unique identifier for the tool.
   * Must use underscores (not dots) to comply with OpenAI API requirements.
   * Should follow naming convention: consumer_domain_action
   * Example: 'set_time_range', 'update_filters'
   *
   * NOTE: Dots are NOT allowed in tool IDs as they don't match the OpenAI
   * API tool name pattern ^[a-zA-Z0-9_-]+$
   */
  id: string;

  /**
   * Description of what the tool does. This is provided to the LLM
   * to help it understand when and how to use the tool.
   */
  description: string;

  /**
   * Zod schema defining the tool's parameters.
   * Use .describe() on each field to provide parameter descriptions for the LLM.
   */
  schema: ZodType<TParams>;

  /**
   * Handler function that executes when the tool is called.
   * This function runs in the browser and receives validated parameters.
   * May return a promise.
   *
   * The returned value is only sent back to the LLM when `returnsResult` is true;
   * otherwise it is discarded (one-way communication).
   */
  handler: (params: TParams) => unknown;

  /**
   * Opt in to two-way communication.
   *
   * When true, the agent execution pauses on the tool call and resumes once the handler
   * settles, with its JSON-serialized return value handed to the model as the tool result.
   * The value must be JSON-serializable, and stays subject to a size limit.
   *
   * Prefer idempotent handlers: reloading the page while a call is pending runs the handler
   * again, since the pending call is what the reloaded page resumes from.
   *
   * Defaults to false, which keeps the fire-and-forget behavior: the model gets an
   * immediate acknowledgement and does not wait for the handler.
   */
  returnsResult?: boolean;

  /**
   * Declares the shape of the handler's return value. Only meaningful with `returnsResult: true`.
   *
   * - `'json'` (default): the JSON-serialized return value is handed to the model verbatim.
   * - `'image'`: the return value must be `{ content: <data URL>, mime_type, filename?, image_attachment_key?, ... }`.
   *   The server extracts the image into a hidden `image` attachment and hands the model
   *   `{ image_attachment_id, ...other fields }` instead, so base64 never enters the model context.
   *   Image results are exempt from the ordinary result size limit (bounded by the route's body cap).
   */
  resultType?: 'json' | 'image';
}

export function toToolMetadata<TParams>(
  tool: BrowserApiToolDefinition<TParams>
): BrowserApiToolMetadata {
  return {
    id: tool.id,
    description: tool.description,
    schema: (() => {
      const { $schema, ...jsonSchema } = z.toJSONSchema(tool.schema, {
        io: 'input',
        unrepresentable: 'any',
      });
      return jsonSchema;
    })(),
    returns_result: tool.returnsResult,
    result_type: tool.resultType,
  };
}
