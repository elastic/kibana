/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCall } from '@kbn/agent-builder-genai-utils/langchain';
import type { PanelFailure } from '../core/utils';
import type { DashboardSummary } from '../summarize_dashboard';

/**
 * Recorded actions. This is the single source of truth for the graph's
 * history — the LangChain message list passed to the model is reconstructed
 * from this array on each cycle.
 *
 * Note: `AgentStepAction.toolCalls[].id` and `ToolResultAction.toolCallId`
 * are required to satisfy provider tool-call/tool-result pairing rules.
 */
export interface AgentStepAction {
  type: 'agent_step';
  toolCalls: ToolCall[];
  text?: string;
}

export interface ToolResultAction {
  type: 'tool_result';
  toolCallId: string;
  name: string;
  success: boolean;
  data?: unknown;
  error?: string;
  /**
   * Present when the tool mutated the dashboard. Captures the post-edit
   * compact summary so the LLM sees the resulting dashboard state in the
   * next turn (workflow-gen's `currentYaml` analog).
   */
  dashboardSummary?: DashboardSummary;
  /**
   * Per-panel soft failures produced by this dispatch. The agent uses these
   * to self-correct mid-loop (workflow-gen's `perEditValidation` analog).
   */
  failures?: PanelFailure[];
}

export type Action = AgentStepAction | ToolResultAction;
