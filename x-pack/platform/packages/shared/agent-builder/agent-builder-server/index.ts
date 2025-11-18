/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ToolProvider,
  ToolProviderHasOptions,
  ToolProviderGetOptions,
  ToolProviderListOptions,
  ExecutableTool,
  ExecutableToolHandlerParams,
  ExecutableToolHandlerFn,
  LLmDescriptionHandlerParams,
  LlmDescriptionHandler,
  ModelProvider,
  ScopedModel,
  ScopedRunner,
  ScopedRunToolFn,
  ScopedRunnerRunToolsParams,
  RunContext,
  RunContextStackEntry,
  RunToolParams,
  RunToolFn,
  Runner,
  RunToolReturn,
  AgentBuilderToolEvent,
  ToolEventHandlerFn,
  ToolEventEmitter,
  ToolProgressEmitterFn,
  ToolResultStore,
  WritableToolResultStore,
} from './runner';
export type {
  ToolHandlerFn,
  ToolHandlerReturn,
  ToolHandlerContext,
  ToolHandlerResult,
  BuiltinToolDefinition,
  StaticToolRegistration,
  StaticEsqlTool,
  StaticWorkflowTool,
  StaticIndexSearchTool,
  ToolAvailabilityContext,
  ToolAvailabilityHandler,
  ToolAvailabilityResult,
  ToolAvailabilityConfig,
} from './tools';
export { getToolResultId, createErrorResult, isToolResultId } from './tools';
export type {
  AgentHandlerParams,
  AgentHandlerContext,
  AgentHandlerReturn,
  AgentHandlerFn,
  RunAgentFn,
  RunAgentParams,
  RunAgentReturn,
  ScopedRunAgentFn,
  ScopedRunnerRunAgentParams,
  AgentEventEmitter,
  AgentEventEmitterFn,
  RunAgentOnEventFn,
} from './agents';
export { chatSystemIndex, chatSystemIndexPrefix } from './indices';
export {
  isAllowedBuiltinTool,
  isAllowedBuiltinAgent,
  AGENT_BUILDER_BUILTIN_TOOLS,
  AGENT_BUILDER_BUILTIN_AGENTS,
} from './allow_lists';
