/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { z } from '@kbn/zod';
import type { ObjectType } from '@kbn/config-schema';
import type { MaybePromise } from '@kbn/utility-types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ToolType } from '@kbn/onechat-common';
import type { InternalToolDefinition } from '../../tool_provider';
import type { ToolPersistedDefinition } from '../client';

export type ToolDefinitionConverter<
  ToolTypeConfig extends object = any,
  TSchema extends z.ZodObject<any> = z.ZodObject<any>
> = (
  persisted: ToolPersistedDefinition<ToolTypeConfig>
) => MaybePromise<InternalToolDefinition<ToolTypeConfig, TSchema>>;

export interface ToolTypeValidatorContext {
  request: KibanaRequest;
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

export interface PersistedToolTypeDefinition<ToolTypeConfig extends object = Record<string, any>> {
  toolType: ToolType;
  toToolDefinition: ToolDefinitionConverter<ToolTypeConfig, any>;
  createSchema: ObjectType;
  updateSchema: ObjectType;
  validateForCreate: ToolTypeCreateValidator<ToolTypeConfig>;
  validateForUpdate: ToolTypeUpdateValidator<ToolTypeConfig>;
}
