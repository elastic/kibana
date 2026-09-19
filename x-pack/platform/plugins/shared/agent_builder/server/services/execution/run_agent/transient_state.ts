/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { ToolCallWithReasoning } from '@kbn/agent-builder-genai-utils/langchain';

/** What the research model decided on its last turn; drives routing out of `researchAgent`. */
export type ResearchOutcome =
  | { type: 'tool_calls'; toolCalls: ToolCallWithReasoning[]; toolCallGroupId: string }
  | { type: 'handover'; message: string; forceful: boolean }
  | { type: 'retry_error'; error: AgentBuilderAgentExecutionError };

/** What the structured answer model produced on its last turn. */
export type AnswerOutcome =
  | { type: 'structured_answer'; data: object }
  | { type: 'retry_error'; error: AgentBuilderAgentExecutionError };

export interface ToolPromptEntry {
  toolCallId: string;
  prompt: PromptRequest;
}

/** Result of the last `executeTool` node; drives routing to `handleToolInterrupt`. */
export type ToolOutcome =
  | { type: 'completed' }
  | { type: 'interrupted'; prompts: ToolPromptEntry[] };

/**
 * How a tool call is executed and represented: `server` calls are durable; `browser` and
 * `dedicated` (tools with their own step lifecycle, e.g. ask_user_question) calls are runtime-only steps.
 */
export type ToolCallKind = 'server' | 'browser' | 'dedicated';

/** Runtime-only per-tool-call data needed to render the current run byte-equivalently. */
export interface ToolRenderState {
  /** The LangChain tool name used in the AI message (`sanitizeToolId(tool_id)` or the browser-prefixed name). */
  toolName: string;
  kind: ToolCallKind;
  /** The research cycle the call was issued in; drives cycle-limit notices and in-flight compaction. */
  cycle?: number;
  /** The exact (already guarded) string content returned by the tool node. Absent for pre-resume steps. */
  content?: string;
}

export type ToolRenderStateMap = Record<string, ToolRenderState>;
export type ToolRenderStateUpdate = Record<string, Partial<ToolRenderState>>;

/** Per-entry merge so `executeTool` can add `content`/`cycle` without clobbering `toolName`/`kind`. */
export const mergeToolRenderState = (
  current: ToolRenderStateMap,
  update: ToolRenderStateUpdate
): ToolRenderStateMap => {
  const next: ToolRenderStateMap = { ...current };
  for (const [toolCallId, patch] of Object.entries(update)) {
    const existing: ToolRenderState = next[toolCallId] ?? { toolName: toolCallId, kind: 'server' };
    next[toolCallId] = { ...existing, ...patch };
  }
  return next;
};

/** A recoverable model error surfaced to the model on the next turn, positioned among the steps. */
export interface RetryNotice {
  phase: 'research' | 'answer';
  /** Number of non-todos steps that existed when the error occurred; the notice renders after that many steps. */
  afterNonTodosStepCount: number;
  error: AgentBuilderAgentExecutionError;
}
