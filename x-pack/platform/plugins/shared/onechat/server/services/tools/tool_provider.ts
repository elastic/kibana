/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodObject } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type { ToolDefinition, ToolType } from '@kbn/onechat-common';
import type { ToolHandlerFn } from '@kbn/onechat-server';
import type { KibanaRequest } from '@kbn/core-http-server';

export interface InternalToolDefinition<
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>,
  TResult = unknown
> extends ToolDefinition<TConfig> {
  /**
   * The zod schema attached to this tool.
   */
  schema: TSchema;
  /**
   * Run handler that can be used to execute the tool.
   */
  handler: ToolHandlerFn<z.infer<TSchema>, TResult>;
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

// TODO: duplicate ? delete?
export type ToolTypeCreateParams<TConfig extends object = {}> = Omit<
  ToolCreateParams<TConfig>,
  'type'
>;
export type ToolTypeUpdateParams<TConfig extends object = {}> = ToolUpdateParams<TConfig>;

/**
 * Defines a provider for a given tool type
 */
export type ToolTypeDefinition<TType extends ToolType = ToolType, TConfig extends object = {}> = {
  /**
   * The type associated with this provider.
   */
  toolType: TType;
} & (
  | {
      readonly?: false | undefined;
      getClient(opts: { request: KibanaRequest }): MaybePromise<ToolTypeClient<TConfig>>;
    }
  | {
      readonly: true;
      getClient(opts: { request: KibanaRequest }): MaybePromise<ReadonlyToolTypeClient<TConfig>>;
    }
);

export interface ToolTypeClient<TConfig extends object = {}>
  extends ReadonlyToolTypeClient<TConfig> {
  /**
   * Create a new tool
   */
  create(params: ToolTypeCreateParams<TConfig>): MaybePromise<InternalToolDefinition<TConfig>>;
  /**
   * Update an existing tool
   */
  update(
    toolId: string,
    update: ToolTypeUpdateParams<TConfig>
  ): MaybePromise<InternalToolDefinition<TConfig>>;

  /**
   * Delete a tool
   */
  delete(toolId: string): MaybePromise<boolean>;
}

export interface ReadonlyToolTypeClient<TConfig extends object = {}> {
  /**
   * Check if a tool is present in the provider
   */
  has(toolId: string): MaybePromise<boolean>;
  /**
   * Retrieve a tool by its ID.
   *
   * Should throw a toolNotFoundException is tool is not found.
   */
  get(toolId: string): MaybePromise<InternalToolDefinition<TConfig>>;
  /**
   * List all tools for this type.
   */
  list(): MaybePromise<Array<InternalToolDefinition<TConfig>>>;
}
