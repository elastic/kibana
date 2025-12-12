/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { z, ZodObject } from '@kbn/zod';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { ToolDefinition, ToolType } from '@kbn/onechat-common';
import type { EsqlToolDefinition } from '@kbn/onechat-common/tools/types/esql';
import type { IndexSearchToolDefinition } from '@kbn/onechat-common/tools/types/index_search';
import type { WorkflowToolDefinition } from '@kbn/onechat-common/tools/types/workflow';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolHandlerFn } from './handler';

/**
 * Information exposed to the {@link ToolAvailabilityHandler}.
 */
export interface ToolAvailabilityContext {
  request: KibanaRequest;
  uiSettings: IUiSettingsClient;
  spaceId: string;
}

/**
 * Information exposed to the {@link ToolAvailabilityHandler}.
 */
export interface ToolAvailabilityResult {
  /**
   * Whether the tool is available or not.
   */
  status: 'available' | 'unavailable';
  /**
   * Optional reason for why the tool is unavailable.
   */
  reason?: string;
}

/**
 * Availability handler for a tool.
 */
export type ToolAvailabilityHandler = (
  context: ToolAvailabilityContext
) => MaybePromise<ToolAvailabilityResult>;

export interface ToolAvailabilityConfig {
  /**
   * handler which can be defined to add conditional availability of the tool.
   *
   * Note: this is meant to be used for tools that are gated behind a feature flag,
   *       or tools which have some condition to be available.
   *       it *IS NOT* meant to be used as a replacement for RBAC.
   */
  handler: ToolAvailabilityHandler;
  /**
   * Cache mode for the result
   * - global: the result will be cached globally, for all spaces
   * - space: the result will be cached per-space
   * - none: the result shouldn't be cached (warning: this can lead to performance issues)
   */
  cacheMode: 'global' | 'space' | 'none';
  /**
   * Optional TTL for the cached result, *in seconds*.
   * Default to 300 seconds (5 minutes).
   */
  cacheTtl?: number;
}

/**
 * Built-in tool, as registered as static tool.
 */
export interface BuiltinToolDefinition<RunInput extends ZodObject<any> = ZodObject<any>>
  extends Omit<ToolDefinition, 'type' | 'readonly' | 'configuration'> {
  /**
   * built-in tool types
   */
  type: ToolType.builtin;
  /**
   * Tool's input schema, defined as a zod schema.
   */
  schema: RunInput;
  /**
   * Handler to call to execute the tool.
   */
  handler: ToolHandlerFn<z.infer<RunInput>>;
  /**
   * Optional dynamic availability configuration.
   * Refer to {@link ToolAvailabilityConfig}
   */
  availability?: ToolAvailabilityConfig;
}

type StaticToolRegistrationMixin<T extends ToolDefinition> = Omit<T, 'readonly'> & {
  /**
   * Optional dynamic availability configuration.
   * Refer to {@link ToolAvailabilityConfig}
   */
  availability?: ToolAvailabilityConfig;
};

export type StaticEsqlTool = StaticToolRegistrationMixin<EsqlToolDefinition>;
export type StaticIndexSearchTool = StaticToolRegistrationMixin<IndexSearchToolDefinition>;
export type StaticWorkflowTool = StaticToolRegistrationMixin<WorkflowToolDefinition>;

export type StaticToolRegistration<RunInput extends ZodObject<any> = ZodObject<any>> =
  | BuiltinToolDefinition<RunInput>
  | StaticEsqlTool
  | StaticIndexSearchTool
  | StaticWorkflowTool;
