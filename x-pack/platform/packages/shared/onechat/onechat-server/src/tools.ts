/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodObject } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ToolDescriptor,
  ToolDescriptorMeta,
  ToolIdentifier,
  PlainIdToolIdentifier,
} from '@kbn/onechat-common';
import type { ModelProvider } from './model_provider';
import type { ScopedRunner, RunToolReturn, ScopedRunnerRunToolsParams } from './runner';
import type { ToolEventEmitter } from './events';

/**
 * Subset of {@link ToolDescriptorMeta} that can be defined during tool registration.
 */
export type RegisteredToolMeta = Partial<Omit<ToolDescriptorMeta, 'providerId'>>;

/**
 * Onechat tool, as registered by built-in tool providers.
 */
export interface RegisteredTool<
  RunInput extends ZodObject<any> = ZodObject<any>,
  RunOutput = unknown
> extends Omit<ToolDescriptor, 'meta'> {
  /**
   * Tool's input schema, defined as a zod schema.
   */
  schema: RunInput;
  /**
   * Handler to call to execute the tool.
   */
  handler: ToolHandlerFn<z.infer<RunInput>, RunOutput>;
  /**
   * Optional set of metadata for this tool.
   */
  meta?: RegisteredToolMeta;
}

/**
 * Tool provider interface, as registered by API consumers.
 */
export interface RegisteredToolProvider {
  /**
   * Check if a tool is available in the provider.
   */
  has(options: { toolId: PlainIdToolIdentifier; request: KibanaRequest }): Promise<boolean>;
  /**
   * Retrieve a tool based on its identifier.
   * If not found,the provider should throw a {@link OnechatToolNotFoundError}
   */
  get(options: { toolId: PlainIdToolIdentifier; request: KibanaRequest }): Promise<RegisteredTool>;
  /**
   * List all tools present in the provider.
   */
  list(options: { request: KibanaRequest }): Promise<RegisteredTool[]>;
}

/**
 * Onechat tool, as exposed by the onechat tool registry.
 */
export interface ExecutableTool<
  RunInput extends ZodObject<any> = ZodObject<any>,
  RunOutput = unknown
> extends ToolDescriptor {
  /**
   * Tool's input schema, defined as a zod schema.
   */
  schema: RunInput;
  /**
   * Run handler that can be used to execute the tool.
   */
  execute: ExecutableToolHandlerFn<z.infer<RunInput>, RunOutput>;
}

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
export type ExecutableToolHandlerFn<TParams = Record<string, unknown>, TResult = unknown> = (
  params: ExecutableToolHandlerParams<TParams>
) => Promise<RunToolReturn<TResult>>;

/**
 * Tool handler function for {@link RegisteredTool} handlers.
 */
export type ToolHandlerFn<
  TParams extends Record<string, unknown> = Record<string, unknown>,
  RunOutput = unknown
> = (args: TParams, context: ToolHandlerContext) => MaybePromise<RunOutput>;

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
   * Can be used to run other workchat primitive as part of the tool execution.
   */
  runner: ScopedRunner;
  /**
   * Event emitter that can be used to emits custom events
   */
  events: ToolEventEmitter;
  /**
   * Logger scoped to this execution
   */
  logger: Logger;
}

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
 * Options for {@link ToolProvider.has}
 */
export interface ToolProviderHasOptions {
  toolId: ToolIdentifier;
  request: KibanaRequest;
}

/**
 * Options for {@link ToolProvider.get}
 */
export interface ToolProviderGetOptions {
  toolId: ToolIdentifier;
  request: KibanaRequest;
}

/**
 * Options for {@link ToolProvider.list}
 */
export interface ToolProviderListOptions {
  request: KibanaRequest;
}
