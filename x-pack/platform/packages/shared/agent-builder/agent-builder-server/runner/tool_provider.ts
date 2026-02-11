/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodObject } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDefinition, ToolType } from '@kbn/agent-builder-common';
import type { RunToolReturn, ScopedRunnerRunToolsParams } from './runner';

/**
 * Common interface shared across all tool providers.
 */
export interface ToolProvider {
  /**
   * Check if a tool is available in the provider
   */
  has(options: ToolProviderHasOptions): Promise<boolean>;
  /**
   * Retrieve a tool based on its identifier.
   * If not found, will throw a toolNotFound error.
   */
  get(options: ToolProviderGetOptions): Promise<ExecutableTool>;
  /**
   * List all tools based on the provided filters
   */
  list(options: ToolProviderListOptions): Promise<ExecutableTool[]>;
}

/**
 * AgentBuilder tool, as exposed by tool providers.
 */
export interface ExecutableTool<
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> extends ToolDefinition<ToolType, TConfig> {
  /**
   * Tool's input schema, defined as a zod schema.
   */
  getSchema: () => MaybePromise<TSchema>;
  /**
   * Run handler that can be used to execute the tool.
   */
  execute: ExecutableToolHandlerFn<z.infer<TSchema>>;
  /**
   * Optional handled to add additional instructions to the LLM.
   * When provided, will replace the description when converting to llm tool.
   */
  getLlmDescription?: LlmDescriptionHandler<TConfig>;
}

export interface LLmDescriptionHandlerParams<TConfig extends object = {}> {
  config: TConfig;
  description: string;
}

export type LlmDescriptionHandler<TConfig extends object = {}> = (
  params: LLmDescriptionHandlerParams<TConfig>
) => MaybePromise<string>;

/**
 * Param type for {@link ExecutableToolHandlerFn}
 */
export type ExecutableToolHandlerParams<TParams = Record<string, unknown>> = Omit<
  ScopedRunnerRunToolsParams<TParams>,
  'toolId'
>;

/**
 * Execution handler for {@link ExecutableTool}
 */
export type ExecutableToolHandlerFn<TParams = Record<string, unknown>> = (
  params: ExecutableToolHandlerParams<TParams>
) => Promise<RunToolReturn>;

/**
 * Options for {@link ToolProvider.has}
 */
export interface ToolProviderHasOptions {
  toolId: string;
  request: KibanaRequest;
}

/**
 * Options for {@link ToolProvider.get}
 */
export interface ToolProviderGetOptions {
  toolId: string;
  request: KibanaRequest;
}

/**
 * Options for {@link ToolProvider.list}
 */
export interface ToolProviderListOptions {
  request: KibanaRequest;
}
