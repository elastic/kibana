/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { z, ZodObject } from '@kbn/zod';
import type { ToolDefinition, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerFn } from './handler';
import type {
  ToolAvailabilityContext,
  ToolAvailabilityResult,
  ToolReturnSummarizerFn,
  ToolConfirmationPolicy,
} from './builtin';
import type { LlmDescriptionHandler } from '../runner';

/**
 * Internal generic representation for a tool definition
 */
export interface InternalToolDefinition<
  TType extends ToolType = ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> extends ToolDefinition<TType, TConfig> {
  /**
   * Check if the tool is available for the current context.
   */
  isAvailable: InternalToolAvailabilityHandler;
  /**
   * Generates the schema attached to this tool.
   */
  getSchema: () => MaybePromise<TSchema>;
  /**
   * Get the handler which can be used to execute the tool.
   */
  getHandler: () => MaybePromise<ToolHandlerFn<z.infer<TSchema>>>;
  /**
   * Optional handled to add additional instructions to the LLM
   * when specified, this will fully replace the description when converting to LLM tools.
   */
  getLlmDescription?: LlmDescriptionHandler<TConfig>;
  /**
   * Optional function to summarize a tool return for conversation history.
   * When provided, this function will be called when processing conversation history
   * to replace large tool results with compact summaries.
   */
  summarizeToolReturn?: ToolReturnSummarizerFn;
  /**
   * Tool call policy to control tool call confirmation behavior
   */
  confirmation?: ToolConfirmationPolicy;
}

export type InternalToolAvailabilityHandler = (
  context: ToolAvailabilityContext
) => MaybePromise<ToolAvailabilityResult>;
