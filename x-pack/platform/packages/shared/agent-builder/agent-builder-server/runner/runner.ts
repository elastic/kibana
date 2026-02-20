/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { PromptRequest, PromptStorageState } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolType } from '@kbn/agent-builder-common';
import type { ToolEventHandlerFn } from './events';
import type { RunAgentFn, ScopedRunAgentFn } from '../agents/runner';
import type { InternalToolDefinition } from '../tools/internal';

/**
 * Return type for tool invocation APIs.
 *
 * Wrapping the plain result to allow extending the shape later without
 * introducing breaking changes.
 */
export interface RunToolReturn {
  /**
   * The result value as returned by the tool.
   */
  results?: ToolResult[];
  /**
   * Interruption returned by the tool
   */
  prompt?: PromptRequest;
}

/**
 * Represents a runner, which is the entry point to execute all agentBuilder primitives,
 * such as tools or agents.
 *
 * This version is not scoped to a given request, and is the version exposed from the plugin's contract.
 */
export interface Runner {
  /**
   * Execute a tool (based on its ID).
   */
  runTool: RunToolFn;
  /**
   * Execute an internal tool definition.
   */
  runInternalTool: RunInternalToolFn;
  /**
   * Execute an agent;
   */
  runAgent: RunAgentFn;
}

/**
 * Represents a runner, which is the entry point to execute all agentBuilder primitives,
 * such as tools or agents.
 *
 * This version is pre-scoped to a given request, meaning APIs don't need to be passed
 * down a request object.
 */
export interface ScopedRunner {
  /**
   * Execute a tool (based on its ID).
   */
  runTool: ScopedRunToolFn;
  /**
   * Execute an internal tool definition.
   */
  runInternalTool: ScopedRunInternalToolFn;
  /**
   * Execute an agent
   */
  runAgent: ScopedRunAgentFn;
}

/**
 * Public agentBuilder API to execute a tools.
 */
export type ScopedRunToolFn = <TParams = Record<string, unknown>>(
  params: ScopedRunnerRunToolsParams<TParams>
) => Promise<RunToolReturn>;

/**
 * Public agentBuilder API to execute a tools.
 */
export type ScopedRunInternalToolFn = <TParams = Record<string, unknown>>(
  params: ScopedRunnerRunInternalToolParams<TParams>
) => Promise<RunToolReturn>;

/**
 * Context bound to a run execution.
 * Contains metadata associated with the run's current state.
 * Will be attached to errors thrown during a run.
 * It is serializable.
 */
export interface RunContext {
  /**
   * The run identifier, which can be used for tracing
   */
  runId: string;
  /**
   * The current execution stack
   */
  stack: RunContextStackEntry[];
}

/**
 * Represents an element in the run context's stack.
 * Used to follow nested / chained execution.
 */
export type RunContextStackEntry =
  /** tool invocation */
  | { type: 'tool'; toolId: string }
  /** agent invocation */
  | { type: 'agent'; agentId: string };

export type ToolCallSource = 'agent' | 'user' | 'mcp' | 'unknown';

/**
 * Params for {@link RunToolFn}
 */
export interface RunToolParams<TParams = Record<string, unknown>> {
  /**
   * ID of the tool to call.
   */
  toolId: string;
  /**
   * Parameters to call the tool with.
   */
  toolParams: TParams;
  /**
   * Optional toolCall id associated with the tool invocation.
   */
  toolCallId?: string;
  /**
   * Optional source of the tool invocation.
   * Defaults to 'unknown'.
   */
  source?: ToolCallSource;
  /**
   * Optional prompt storage state to use for tool invocation.
   */
  promptState?: PromptStorageState;
  /**
   * Optional event handler.
   */
  onEvent?: ToolEventHandlerFn;
  /**
   * The request that initiated that run.
   */
  request: KibanaRequest;
  /**
   * Optional genAI connector id to use as default.
   * If unspecified, will use internal logic to use the default connector
   * (EIS if there, otherwise openAI, otherwise any GenAI)
   */
  defaultConnectorId?: string;
  /**
   * Optional abort signal for the run (e.g. from the request).
   * Propagated to hooks so they can respect cancellation.
   */
  abortSignal?: AbortSignal;
}

export type RunInternalToolParams<TParams = Record<string, unknown>> = Omit<
  RunToolParams<TParams>,
  'toolId'
> & {
  tool: InternalToolDefinition<ToolType, any, any>;
};

/**
 * Params for {@link ScopedRunner.runTool}
 */
export type ScopedRunnerRunToolsParams<TParams = Record<string, unknown>> = Omit<
  RunToolParams<TParams>,
  'request' | 'promptState'
>;

export type ScopedRunnerRunInternalToolParams<TParams = Record<string, unknown>> = Omit<
  RunInternalToolParams<TParams>,
  'request' | 'promptState'
>;

/**
 * Public agentBuilder API to execute a tools.
 */
export type RunToolFn = <TParams = Record<string, unknown>>(
  params: RunToolParams<TParams>
) => Promise<RunToolReturn>;

export type RunInternalToolFn = <TParams = Record<string, unknown>>(
  params: RunInternalToolParams<TParams>
) => Promise<RunToolReturn>;
