/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodObject } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type { ToolDefinition, ToolType } from '@kbn/onechat-common';
import type {
  ToolHandlerFn,
  LlmDescriptionHandler,
  ToolAvailabilityContext,
  ToolAvailabilityResult,
} from '@kbn/onechat-server';
import type { KibanaRequest } from '@kbn/core-http-server';

type InternalToolAvailabilityHandler = (
  context: ToolAvailabilityContext
) => MaybePromise<ToolAvailabilityResult>;

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
}

export interface ToolCreateParams<TConfig extends object = {}> {
  id: string;
  type: ToolType;
  description?: string;
  tags?: string[];
  configuration: TConfig;
}

export interface ToolUpdateParams<TConfig extends object = {}> {
  description?: string;
  tags?: string[];
  configuration?: Partial<TConfig>;
}

export type ToolTypeCreateParams<TConfig extends object = {}> = ToolCreateParams<TConfig>;
export type ToolTypeUpdateParams<TConfig extends object = {}> = ToolUpdateParams<TConfig>;

export interface ReadonlyToolProvider {
  id: string;
  readonly: true;
  has(toolId: string): MaybePromise<boolean>;
  get(toolId: string): MaybePromise<InternalToolDefinition>;
  list(): MaybePromise<Array<InternalToolDefinition>>;
}

export interface WritableToolProvider extends Omit<ReadonlyToolProvider, 'readonly'> {
  readonly: false;
  create(params: ToolTypeCreateParams): MaybePromise<InternalToolDefinition>;
  update(toolId: string, update: ToolTypeUpdateParams): MaybePromise<InternalToolDefinition>;
  delete(toolId: string): MaybePromise<boolean>;
}

export type ToolProviderFn<Readonly extends boolean> = (opts: {
  request: KibanaRequest;
  space: string;
}) => MaybePromise<Readonly extends true ? ReadonlyToolProvider : WritableToolProvider>;

export type ToolProvider = ReadonlyToolProvider | WritableToolProvider;

export const isReadonlyToolProvider = (
  provider: ToolProvider
): provider is ReadonlyToolProvider => {
  return provider.readonly;
};

export const isWritableToolProvider = (
  provider: ToolProvider
): provider is WritableToolProvider => {
  return !provider.readonly;
};
