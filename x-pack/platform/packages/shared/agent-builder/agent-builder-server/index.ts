/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ProcessedAttachment, ProcessedRoundInput } from './processed_input';
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
  ToolResultStore,
  WritableToolResultStore,
  ToolPromptManager,
  ToolStateManager,
} from './runner';
export { getAgentFromRunContext } from './runner';
export type {
  ToolHandlerFn,
  ToolHandlerReturn,
  ToolHandlerStandardReturn,
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
  InternalToolAvailabilityHandler,
  InternalToolDefinition,
  ToolReturnSummarizerFn,
  ToolRegistry,
  ToolListParams,
  ToolCreateParams,
  ToolUpdateParams,
} from './tools';
export {
  getToolResultId,
  createErrorResult,
  createOtherResult,
  isToolResultId,
  isToolHandlerStandardReturn,
} from './tools';
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
  ExperimentalFeatures,
  SubAgentExecutor,
  SubAgentExecution,
} from './agents';
export type {
  AgentBuilderHooks,
  HookContext,
  HookContextByLifecycle as HookContextByEvent,
  BlockingHookHandler as HookHandler,
  HookHandlerResult,
  HookHandlerResultByLifecycle as HookHandlerResultByEvent,
  HookRegistration,
  HooksServiceSetup,
  HooksServiceStart,
  BeforeAgentHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
} from './hooks/types';
export { HookLifecycle, HookExecutionMode } from './hooks/types';
export {
  applyHookResultByLifecycle,
  applyBeforeAgentResult,
  applyBeforeToolCallResult,
  applyAfterToolCallResult,
} from './hooks/apply_result';
export { chatSystemIndex, chatSystemIndexPrefix } from './indices';
export type { AgentBuilderAnalytics, AgentBuilderTracking, SkillInvokedEvent } from './telemetry';
export type {
  BuiltInPluginDefinition,
  PluginCreateRequest,
  PluginUpdateRequest,
  PersistedPluginManifestMetadata,
  PluginRegistry,
} from './plugins';
export type {
  AgentExecutionParams,
  AgentExecution,
  ExecuteAgentParams,
  ExecuteAgentResult,
  FindExecutionsFilter,
  FindExecutionsOptions,
  AgentExecutionService,
} from './execution';
export type {
  InternalAgentDefinition,
  InternalAgentDefinitionAvailabilityHandler,
  AgentRegistry,
} from './agents';
export type { SkillRegistry } from './skills';
// `SkillBoundedTool` is the return-type union for `SkillDefinition.getInlineTools`.
// Re-exporting from the package root so consumers (e.g. the discoveries
// plugin's attack-discovery generator skill) can type their inline tools
// without subpath imports. Type-only addition — no runtime impact.
export type { BuiltinSkillBoundedTool, SkillBoundedTool } from './skills/tools';
// `SkillDefinition` is the server-side type used to define an agent-builder
// skill. Re-exported here for consumers that register skills (e.g. the
// discoveries plugin's workflow-troubleshooting skill). Type-only addition.
export type { SkillDefinition } from './skills';
export type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  TopSnippetsConfig,
  ToolsSetup,
  ToolsStart,
  AttachmentsSetup,
  SkillsSetup,
  SkillsStart,
  AgentsSetup,
  AgentsStart,
  ExecutionStart,
  PluginsSetup,
  PluginsStart,
  RuntimeStart,
  ReadOnlyConversationClient,
  ConversationsStart,
} from './plugin_contract';
export { describeZodSchema, formatSchemaForLlm } from './tools';
