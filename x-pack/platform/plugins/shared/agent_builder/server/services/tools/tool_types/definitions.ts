/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolType } from '@kbn/agent-builder-common';
import type { z, ZodObject } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type { LlmDescriptionHandler, ToolHandlerFn } from '@kbn/agent-builder-server';
import type { ObjectType } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/**
 * Descriptor for a tool type.
 */
export interface ToolTypeDefinition<
  TType extends ToolType = ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>,
  /**
   * Configuration shape as it is persisted (e.g. legacy shapes).
   * Most tool types will keep persistence and runtime config aligned.
   */
  TPersistedConfig extends object = TConfig
> {
  toolType: TType;
  getDynamicProps: ToolHandlerDynamicPropsFn<TConfig, TSchema>;

  createSchema: ObjectType;
  updateSchema: ObjectType;
  validateForCreate: ToolTypeCreateValidator<TConfig>;
  validateForUpdate: ToolTypeUpdateValidator<TConfig>;

  /**
   * Optional conversion hook for persisted tool configurations.
   * This is called when loading persisted tools, before building dynamic props.
   *
   * Useful for backward compatibility when the persisted schema changes.
   */
  convertFromPersistence?: (
    config: TPersistedConfig,
    context: ToolTypeConversionContext
  ) => TConfig;

  /**
   * Optional conversion hook to produce a persisted config from the runtime config.
   * This is called when creating/updating tools, just before writing to persistence.
   *
   * Useful for keeping runtime config free of persistence-only fields (e.g. schema_version),
   * while still storing them for migrations and backward compatibility.
   */
  convertToPersistence?: (config: TConfig, context: ToolTypeConversionContext) => TPersistedConfig;

  /**
   * Whether to track execution health for tools of this type.
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
}

export interface ToolTypeValidatorContext {
  request: KibanaRequest;
  spaceId: string;
  esClient: ElasticsearchClient;
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
}

export type ToolHandlerDynamicPropsFn<
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> = (
  config: TConfig,
  ctx: ToolDynamicPropsContext
) => MaybePromise<ToolHandlerDynamicProps<TConfig, TSchema>>;
