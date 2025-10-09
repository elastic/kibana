/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodObject } from '@kbn/zod';
import type { ToolDefinition, ToolType } from '@kbn/onechat-common';
import type { EsqlToolDefinition } from '@kbn/onechat-common/tools/types/esql';
import type { IndexSearchToolDefinition } from '@kbn/onechat-common/tools/types/index_search';
import type { WorkflowToolDefinition } from '@kbn/onechat-common/tools/types/workflow';
import type { ToolHandlerFn } from './handler';

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
}

type StaticToolRegistrationMixin<T extends ToolDefinition> = Omit<T, 'readonly'>;

export type StaticEsqlTool = StaticToolRegistrationMixin<EsqlToolDefinition>;
export type StaticIndexSearchTool = StaticToolRegistrationMixin<IndexSearchToolDefinition>;
export type StaticWorkflowTool = StaticToolRegistrationMixin<WorkflowToolDefinition>;

export type StaticToolRegistration<RunInput extends ZodObject<any> = ZodObject<any>> =
  | BuiltinToolDefinition<RunInput>
  | StaticEsqlTool
  | StaticIndexSearchTool
  | StaticWorkflowTool;
