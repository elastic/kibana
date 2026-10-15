/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { z, ZodObject } from '@kbn/zod/v4';
import type {
  ToolCallWithResult,
  ToolDefinition,
  ToolType,
  ToolConfirmationPolicy,
} from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { EsqlToolDefinition } from '@kbn/agent-builder-common/tools/types/esql';
import type { IndexSearchToolDefinition } from '@kbn/agent-builder-common/tools/types/index_search';
import type { WorkflowToolDefinition } from '@kbn/agent-builder-common/tools/types/workflow';
import type { ConfirmPromptDefinition } from '@kbn/agent-builder-common/agents';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type {
  AvailabilityContext,
  AvailabilityResult,
  AvailabilityHandler,
  AvailabilityConfig,
} from '../availability';
import type { ToolHandlerContext, ToolHandlerFn } from './handler';

/**
 * MCP tool annotations for builtin tools exposed via the Agent Builder MCP server.
 *
 * All five fields are required so tool authors must make an explicit classification
 * choice. The type is derived from the MCP SDK's ToolAnnotations to stay in sync
 * with the spec — if the SDK renames or removes a field, TypeScript will surface
 * the break here.
 *
 * Annotation guide (copy these values directly):
 *
 * Pure read (search, list, get):
 *   readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false
 *
 * Create / upsert (non-destructive write):
 *   readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false
 *
 * Delete / irreversible overwrite:
 *   readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false
 *
 * Calls external API / webhook / email (combine with one of the above):
 *   openWorldHint: true
 *
 * Rules:
 * - readOnlyHint and destructiveHint must not both be true.
 * - Read-only tools should always set idempotentHint: true.
 *
 * See: https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations
 */
export type McpToolAnnotations = Required<
  Pick<
    ToolAnnotations,
    'title' | 'readOnlyHint' | 'destructiveHint' | 'idempotentHint' | 'openWorldHint'
  >
>;

/**
 * Tool-specific aliases for the shared availability types.
 * See {@link AvailabilityConfig} for full documentation.
 */
export type ToolAvailabilityContext = AvailabilityContext;
export type ToolAvailabilityResult = AvailabilityResult;
export type ToolAvailabilityHandler = AvailabilityHandler;
export type ToolAvailabilityConfig = AvailabilityConfig;

export type ToolPolicyConfirmationDefinition = Omit<ConfirmPromptDefinition, 'id'>;

export interface BuiltInToolConfirmationContext<
  TParams extends Record<string, unknown> = Record<string, unknown>
> {
  toolParams: TParams;
  context: ToolHandlerContext;
}

export interface BuiltInToolConfirmationPolicy<
  TParams extends Record<string, unknown> = Record<string, unknown>
> extends ToolConfirmationPolicy {
  /**
   * If set, will be used to get the confirmation
   */
  getConfirmation?: (
    context: BuiltInToolConfirmationContext<TParams>
  ) => MaybePromise<ToolPolicyConfirmationDefinition>;
}

export interface BuiltInToolSpecificConfig<
  TParams extends Record<string, unknown> = Record<string, unknown>
> {
  /**
   * Optional dynamic availability configuration.
   * Refer to {@link ToolAvailabilityConfig}
   */
  availability?: ToolAvailabilityConfig;
  /**
   * When true, this tool is only available when experimental features are enabled.
   * Defaults to false.
   */
  experimental?: boolean;
  /**
   * Optional tool call policy to control tool call confirmation behavior
   */
  confirmation?: BuiltInToolConfirmationPolicy<TParams>;
  /**
   * Optional function to summarize a tool return for conversation history.
   * When provided, this function will be called when processing conversation history
   * to replace large tool results with compact summaries.
   * This helps prevent context bloat in long conversations.
   */
  summarizeToolReturn?: ToolReturnSummarizerFn;
  /**
   * Per-tool override of the tool-result length guardrail's token budget.
   * When set, replaces the ToolManager-wide default for this tool specifically.
   * Set to `Infinity` to fully exempt this tool's results from truncation.
   */
  maxResultTokens?: number;
  /**
   * When true, this tool is excluded from the MCP server's tool list but
   * remains available to 1P Agent Builder chat via the builtin tool registry.
   */
  excludeFromMcp?: boolean;
}

/**
 * Function to summarize a tool return for conversation history.
 * Used to reduce context size by replacing large tool results with compact summaries.
 *
 * This function receives all results from a single tool call, allowing it to
 * aggregate and summarize multiple results together (e.g., converting 10 search
 * results into a single summary like "search returned 10 docs, ids are: ...").
 *
 * @param toolReturn - All results from a single tool call
 * @returns The summarized results, or undefined if no summarization should be applied
 */
export type ToolReturnSummarizerFn = (
  toolReturn: ToolCallWithResult
) => ToolCallWithResult['results'] | undefined;

/**
 * Built-in tool, as registered as static tool.
 */
export interface BuiltinToolDefinition<
  RunInput extends ZodObject<any> = ZodObject<any>,
  TResult extends ToolResult = ToolResult
> extends Omit<
      ToolDefinition,
      'type' | 'readonly' | 'configuration' | 'experimental' | 'confirmation'
    >,
    BuiltInToolSpecificConfig<z.infer<RunInput>> {
  /**
   * built-in tool types
   */
  type: ToolType.builtin;
  /**
   * Tool's input schema, defined as a zod schema.
   */
  schema: RunInput;
  /**
   * Handler to call to execute the tool.
   */
  handler: ToolHandlerFn<z.infer<RunInput>, TResult>;
  /**
   * Optional dynamic availability configuration.
   * Refer to {@link ToolAvailabilityConfig}
   */
  availability?: ToolAvailabilityConfig;
  /**
   * MCP annotations for this tool. Required for all builtin tools exposed via the MCP server.
   * See {@link McpToolAnnotations} for the full guide.
   */
  annotations: McpToolAnnotations;
}

/**
 * Tool definition for internal agent-runner tools (bash, sleep, etc.) that use
 * BuiltinToolDefinition but are never exposed via the MCP server.
 * Omits annotations since these tools bypass MCP registration.
 */
export type InternalBuiltinToolDefinition<
  RunInput extends ZodObject<any> = ZodObject<any>,
  TResult extends ToolResult = ToolResult
> = Omit<BuiltinToolDefinition<RunInput, TResult>, 'annotations'>;

type StaticToolRegistrationMixin<T extends ToolDefinition> = Omit<T, 'readonly' | 'experimental'> &
  BuiltInToolSpecificConfig;

export type StaticEsqlTool = StaticToolRegistrationMixin<EsqlToolDefinition>;
export type StaticIndexSearchTool = StaticToolRegistrationMixin<IndexSearchToolDefinition>;
export type StaticWorkflowTool = StaticToolRegistrationMixin<WorkflowToolDefinition>;

export type StaticToolRegistration<
  RunInput extends ZodObject<any> = ZodObject<any>,
  TResult extends ToolResult = ToolResult
> =
  | BuiltinToolDefinition<RunInput, TResult>
  | StaticEsqlTool
  | StaticIndexSearchTool
  | StaticWorkflowTool;
