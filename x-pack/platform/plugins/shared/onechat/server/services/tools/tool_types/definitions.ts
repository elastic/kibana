/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolType } from '@kbn/onechat-common';
import type { z, ZodObject } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type {
  LlmDescriptionHandler,
  ToolHandlerFn,
  ToolAvailabilityResult,
} from '@kbn/onechat-server';
import type { ObjectType } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

/**
 * Descriptor for a tool type.
 */
export interface ToolTypeDefinition<
  TType extends ToolType = ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> {
  toolType: TType;
  getDynamicProps: ToolHandlerDynamicPropsFn<TConfig, TSchema>;

  createSchema: ObjectType;
  updateSchema: ObjectType;
  validateForCreate: ToolTypeCreateValidator<TConfig>;
  validateForUpdate: ToolTypeUpdateValidator<TConfig>;

/**
* Optional hook to auto-populate the tool description at creation time.
*
* If implemented, this hook is called when the user doesn't provide a description,
* allowing the tool type to fetch one from an external source (e.g., MCP tools
* fetch from the MCP server's tool definition).
*
* Tool types without an external description source should not implement this hook.
* In that case, tools created without a description will have an empty description.
*/
  getAutoDescription?: (
    config: TConfig,
    context: ToolTypeValidatorContext
  ) => MaybePromise<string | undefined>;

  /**
   * Optional hook to check if a tool of this type is available.
   *
   * If implemented, this hook is called when listing or retrieving tools to verify
   * they're still usable. For example, MCP tools use this to check if the underlying
   * connector still exists.
   *
   * Tool types without external dependencies should not implement this hook.
   * In that case, tools will always be considered available.
   */
  isAvailable?: (
    config: TConfig,
    context: ToolDynamicPropsContext
  ) => MaybePromise<ToolAvailabilityResult>;

  /**
   * Whether to track execution health for tools of this type.
   *
   * When enabled, successful and failed tool executions are recorded to the tool health index.
   * This is useful for tools that depend on external services (e.g., MCP tools connecting
   * to external MCP servers) where tracking failure patterns helps identify connectivity issues.
   *
   * Defaults to false if not specified.
   */
  trackHealth?: boolean;
}

/**
 * Descriptor for disabled tool types.
 * Can be used to register types which aren't usable, e.g. workflow tools without the plugin being enabled.
 */
export interface DisabledToolTypeDefinition<TType extends ToolType = ToolType> {
  toolType: TType;
  disabled: true;
}

/**
 * Specific descriptor for builtin tool types.
 */
export interface BuiltinToolTypeDefinition {
  toolType: ToolType.builtin;
  builtin: true;
}

export interface ToolTypeConversionContext {
  request: KibanaRequest;
  spaceId: string;
  esClient: ElasticsearchClient;
  actions: ActionsPluginStart;
}

export interface ToolTypeValidatorContext {
  request: KibanaRequest;
  spaceId: string;
  esClient: ElasticsearchClient;
  actions: ActionsPluginStart;
}

export type ToolTypeCreateValidator<ToolTypeConfig extends object = Record<string, any>> = (opts: {
  config: ToolTypeConfig;
  context: ToolTypeValidatorContext;
}) => MaybePromise<ToolTypeConfig>;

export type ToolTypeUpdateValidator<ToolTypeConfig extends object = Record<string, any>> = (opts: {
  current: ToolTypeConfig;
  update: Partial<ToolTypeConfig>;
  context: ToolTypeValidatorContext;
}) => MaybePromise<ToolTypeConfig>;

export type AnyToolTypeDefinition<
  TType extends ToolType = ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> =
  | ToolTypeDefinition<TType, TConfig, TSchema>
  | DisabledToolTypeDefinition<TType>
  | BuiltinToolTypeDefinition;

export const isEnabledDefinition = <
  TType extends ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
>(
  definition: AnyToolTypeDefinition<TType, TConfig, TSchema>
): definition is ToolTypeDefinition<TType, TConfig, TSchema> => {
  return !('disabled' in definition) && !('builtin' in definition);
};

export const isBuiltinDefinition = <
  TType extends ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
>(
  definition: AnyToolTypeDefinition<TType, TConfig, TSchema>
): definition is BuiltinToolTypeDefinition => {
  return 'builtin' in definition && definition.builtin;
};

export const isDisabledDefinition = <
  TType extends ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
>(
  definition: AnyToolTypeDefinition<TType, TConfig, TSchema>
): definition is DisabledToolTypeDefinition<TType> => {
  return 'disabled' in definition && definition.disabled;
};

export interface ToolHandlerDynamicProps<
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> {
  /**
   * The zod schema attached to this tool.
   */
  getSchema: () => MaybePromise<TSchema>;
  /**
   * Run handler that can be used to execute the tool.
   */
  getHandler: () => MaybePromise<ToolHandlerFn<z.infer<TSchema>>>;
  /**
   * Optional handler to add additional instructions to the LLM
   * when specified, this will fully replace the description when converting to LLM tools.
   */
  getLlmDescription?: LlmDescriptionHandler<TConfig>;
}

export interface ToolDynamicPropsContext {
  spaceId: string;
  request: KibanaRequest;
  actions: ActionsPluginStart;
}

export type ToolHandlerDynamicPropsFn<
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> = (
  config: TConfig,
  ctx: ToolDynamicPropsContext
) => MaybePromise<ToolHandlerDynamicProps<TConfig, TSchema>>;
