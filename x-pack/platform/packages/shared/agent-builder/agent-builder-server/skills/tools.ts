/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { EsqlToolDefinition, ToolDefinition } from '@kbn/agent-builder-common';
import type {
  IndexSearchToolDefinition,
  WorkflowToolDefinition,
} from '@kbn/agent-builder-common/tools';
import type { BuiltinToolDefinition } from '../tools/builtin';

export type BuiltinSkillBoundedTool<RunInput extends ZodObject<any> = ZodObject<any>> = Omit<
  BuiltinToolDefinition<RunInput>,
  'tags' | 'availability'
>;

type SkillBoundToolMixin<T extends ToolDefinition> = Omit<T, 'readonly' | 'tags'>;

export type StaticEsqlSkillBoundedTool = SkillBoundToolMixin<EsqlToolDefinition>;
export type IndexSearchSkillBoundedTool = SkillBoundToolMixin<IndexSearchToolDefinition>;
export type WorkflowSkillBoundedTool = SkillBoundToolMixin<WorkflowToolDefinition>;

/**
 * Definition of a tool which is bounded to a skill instance.
 */
export type SkillBoundedTool<RunInput extends ZodObject<any> = ZodObject<any>> =
  | BuiltinSkillBoundedTool<RunInput>
  | StaticEsqlSkillBoundedTool
  | IndexSearchSkillBoundedTool
  | WorkflowSkillBoundedTool;
