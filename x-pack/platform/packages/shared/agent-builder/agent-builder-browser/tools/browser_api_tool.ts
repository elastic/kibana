/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { ZodSchema } from '@kbn/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
  schema: ZodSchema<TParams>;

  /**
   * Handler function that executes when the tool is called.
   * This function runs in the browser and receives validated parameters.
   * Results are NOT returned to the LLM (one-way communication).
   */
  handler: (params: TParams) => void | Promise<void>;
}

export function toToolMetadata<TParams>(
  tool: BrowserApiToolDefinition<TParams>
): BrowserApiToolMetadata {
  return {
    id: tool.id,
    description: tool.description,
    schema: zodToJsonSchema(tool.schema),
  };
}
