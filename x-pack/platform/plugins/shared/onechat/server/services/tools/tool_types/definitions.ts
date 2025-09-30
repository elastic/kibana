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
import type { LlmDescriptionHandler, ToolHandlerFn } from '@kbn/onechat-server';

export interface ToolTypeDefinition<
  TType extends ToolType = ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> {
  type: TType;
  disabled?: false;
  getGeneratedProps: ToolHandlerSchemaTupleProvider<TConfig, TSchema>;
}

export interface DisabledToolTypeDefinition<TType extends ToolType = ToolType> {
  type: TType;
  disabled: true;
}

export type AnyToolTypeDefinition<
  TType extends ToolType = ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> = ToolTypeDefinition<TType, TConfig, TSchema> | DisabledToolTypeDefinition<TType>;

export const isEnabledDefinition = <
  TType extends ToolType,
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
>(
  definition: AnyToolTypeDefinition<TType, TConfig, TSchema>
): definition is ToolTypeDefinition<TType, TConfig, TSchema> => {
  return definition.disabled !== true;
};

export interface ToolHandlerSchemaTuple<TSchema extends ZodObject<any> = ZodObject<any>> {
  /**
   * The zod schema attached to this tool.
   */
  getSchema: () => MaybePromise<TSchema>;
  /**
   * Run handler that can be used to execute the tool.
   */
  handler: ToolHandlerFn<z.infer<TSchema>>;
  /**
   * Optional handler to add additional instructions to the LLM
   * when specified, this will fully replace the description when converting to LLM tools.
   */
  llmDescription?: LlmDescriptionHandler;
}

export interface ToolDynamicPropsContext {
  spaceId: string;
  request: KibanaRequest;
}

export type ToolHandlerSchemaTupleProvider<
  TConfig extends object = {},
  TSchema extends ZodObject<any> = ZodObject<any>
> = (
  config: TConfig,
  ctx: ToolDynamicPropsContext
) => MaybePromise<ToolHandlerSchemaTuple<TSchema>>;
