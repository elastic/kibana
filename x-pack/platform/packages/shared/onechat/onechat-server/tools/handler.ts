/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type {
  ToolEventEmitter,
  ModelProvider,
  ScopedRunner,
  ToolProvider,
  ToolResultStore,
} from '../runner';

/**
 * Tool result as returned by the tool handler.
 */
export type ToolHandlerResult = Omit<ToolResult, 'tool_result_id'> & { tool_result_id?: string };

/**
 * Return value for {@link ToolHandlerFn} / {@link BuiltinToolDefinition}
 */
export interface ToolHandlerReturn {
  results: ToolHandlerResult[];
}

/**
 * Tool handler function for {@link BuiltinToolDefinition} handlers.
 */
export type ToolHandlerFn<TParams extends Record<string, unknown> = Record<string, unknown>> = (
  args: TParams,
  context: ToolHandlerContext
) => MaybePromise<ToolHandlerReturn>;

/**
 * Scoped context which can be used during tool execution to access
 * a panel of built-in services, such as a pre-scoped elasticsearch client.
 */
export interface ToolHandlerContext {
  /**
   * The request that was provided when initiating that tool execution.
   * Can be used to create scoped services not directly exposed by this context.
   */
  request: KibanaRequest;
  /**
   * A cluster client scoped to the current user.
   * Can be used to access ES on behalf of either the current user or the system user.
   */
  esClient: IScopedClusterClient;
  /**
   * Inference model provider scoped to the current user.
   * Can be used to access the inference APIs or chatModel.
   */
  modelProvider: ModelProvider;
  /**
   * Tool provider that can be used to list or execute tools.
   */
  toolProvider: ToolProvider;
  /**
   * Onechat runner scoped to the current execution.
   */
  runner: ScopedRunner;
  /**
   * Result store to access tool results during execution.
   */
  resultStore: ToolResultStore;
  /**
   * Event emitter that can be used to emits custom events
   */
  events: ToolEventEmitter;
  /**
   * Logger scoped to this execution
   */
  logger: Logger;
  /**
   * LLM Tasks plugin start contract for accessing documentation retrieval and other LLM tasks.
   */
  llmTasks?: LlmTasksPluginStart;
}
