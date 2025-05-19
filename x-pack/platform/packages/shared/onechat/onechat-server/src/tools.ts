/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, ZodRawShape, ZodTypeAny } from '@kbn/zod';
import { MaybePromise } from '@kbn/utility-types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDescriptor } from '@kbn/onechat-common';
import type { ModelProvider } from './model_provider';

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
  handler: (
    args: z.objectOutputType<RunInput, ZodTypeAny>,
    context: ToolHandlerContext
  ) => MaybePromise<RunOutput>;
}

/**
 * Scoped context which can be used during tool execution to access
 * a panel of built-in services, such as a pre-scoped elasticsearch client.
 */
export interface ToolHandlerContext {
  /**
   * A cluster client scoped to the current user.
   */
  esClient: IScopedClusterClient;
  /**
   * Inference model provider scoped to the current user.
   */
  modelProvider: ModelProvider;

  // TODO: tool executor

  // TODO: event system
}

/**
 * Common interface shared across all tool providers.
 */
export interface ToolProvider {
  // TODO

  get(options: { toolId: string; request: KibanaRequest }): Promise<Tool>;

  list(options: { request: KibanaRequest }): Promise<Tool[]>;
}
