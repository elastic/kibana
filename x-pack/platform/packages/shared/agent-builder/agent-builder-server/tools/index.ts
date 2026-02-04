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
  ToolReturnSummarizerFn,
  ToolConfirmationPolicy,
  ToolConfirmationPolicyMode,
} from './builtin';
export {
  type ToolHandlerFn,
  type ToolHandlerReturn,
  type ToolHandlerContext,
  type ToolHandlerResult,
  type ToolHandlerPromptReturn,
  type ToolHandlerStandardReturn,
  isToolHandlerInterruptReturn,
  isToolHandlerStandardReturn,
} from './handler';
export { getToolResultId, createErrorResult, createOtherResult, isToolResultId } from './utils';
export type { InternalToolDefinition, InternalToolAvailabilityHandler } from './internal';
export type { ToolRegistry, ToolListParams, ToolCreateParams, ToolUpdateParams } from './registry';
