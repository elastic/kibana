/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata, ToolResult } from '@kbn/agent-builder-common';
import type { ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import { z, type ZodType } from '@kbn/zod/v4';

/**
 * Result returned by a two-way browser tool handler (`returnsResult: true`).
 * The client posts this back via resume so the LLM can continue with real data.
 * `tool_result_id` is optional — the server assigns ids when materializing the ToolMessage.
 */
export interface BrowserApiToolHandlerResult {
  results: Array<Omit<ToolResult, 'tool_result_id'> & { tool_result_id?: string }>;
  /** Optional screenshot / image for multimodal injection on resume. */
  image?: ImageAttachmentData;
}
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
   * When true, the agent run pauses until the client executes the handler and
   * resumes with the handler result (two-way). Default false = fire-and-forget
   * (one-way); the LLM only sees a stub "executed on client" tool result.
   */
  returnsResult?: boolean;

  /**
   * Handler function that executes when the tool is called.
   * This function runs in the browser and receives validated parameters.
   *
   * For one-way tools (`returnsResult` omitted/false), the return value is ignored.
   * For two-way tools (`returnsResult: true`), return {@link BrowserApiToolHandlerResult}
   * so the client can resume the round with results (and optional image) for the LLM.
   */
  handler: (
    params: TParams
  ) => void | Promise<void> | BrowserApiToolHandlerResult | Promise<BrowserApiToolHandlerResult>;
}

export function toToolMetadata<TParams>(
  tool: BrowserApiToolDefinition<TParams>
): BrowserApiToolMetadata {
  return {
    id: tool.id,
    description: tool.description,
    returns_result: tool.returnsResult === true,
    schema: (() => {
      const { $schema, ...jsonSchema } = z.toJSONSchema(tool.schema, {
        io: 'input',
        unrepresentable: 'any',
      });
      return jsonSchema;
    })(),
  };
}
