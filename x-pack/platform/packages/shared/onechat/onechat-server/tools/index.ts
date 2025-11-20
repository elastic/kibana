/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  BuiltinToolDefinition,
  StaticToolRegistration,
  StaticEsqlTool,
  StaticWorkflowTool,
  StaticIndexSearchTool,
  ToolAvailabilityContext,
  ToolAvailabilityHandler,
  ToolAvailabilityResult,
  ToolAvailabilityConfig,
} from './builtin';
export type {
  ToolHandlerFn,
  ToolHandlerReturn,
  ToolHandlerContext,
  ToolHandlerResult,
} from './handler';
export { getToolResultId, createErrorResult, isToolResultId } from './utils';
