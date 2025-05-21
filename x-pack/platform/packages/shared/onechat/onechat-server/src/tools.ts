/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodRawShape, ZodTypeAny } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDescriptor } from '@kbn/onechat-common';
import type { ModelProvider } from './model_provider';
import type { ScopedRunner } from './runner';

/**
 * Represents a onechat tool.
 */
export interface Tool<RunInput extends ZodRawShape = ZodRawShape, RunOutput = unknown>
  extends ToolDescriptor {
  /**
   * Tool's input schema, in zod format.
   */
  schema: RunInput;
  /**
   * Handler to call to execute the tool.
   */
  handler: ToolHandlerFn<RunInput, RunOutput>;
}

/**
 * Tool handler function for {@link Tool} handlers.
 */
export type ToolHandlerFn<RunInput extends ZodRawShape = ZodRawShape, RunOutput = unknown> = (
  args: z.objectOutputType<RunInput, ZodTypeAny>,
  context: ToolHandlerContext
) => MaybePromise<RunOutput>;

/**
 * Scoped context which can be used during tool execution to access
 * a panel of built-in services, such as a pre-scoped elasticsearch client.
 */
export interface ToolHandlerContext {
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
   * Onechat runner scoped to the current execution.
   * Can be used to run other workchat primitive as part of the tool execution.
   */
  runner: ScopedRunner;

  // TODO: event system
}

/**
 * Common interface shared across all tool providers.
 */
export interface ToolProvider {
  /**
   * TODO doc
   */
  has(options: ToolProviderHasOptions): Promise<boolean>;
  /**
   * TODO doc
   */
  get(options: ToolProviderGetOptions): Promise<Tool>;
  /**
   * TODO doc
   */
  list(options: ToolProviderListOptions): Promise<Tool[]>;
}

export interface ToolProviderHasOptions {
  toolId: string;
  request: KibanaRequest;
}

export interface ToolProviderGetOptions {
  toolId: string;
  request: KibanaRequest;
}

export interface ToolProviderListOptions {
  request: KibanaRequest;
}
