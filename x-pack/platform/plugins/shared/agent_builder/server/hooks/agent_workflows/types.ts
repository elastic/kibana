/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Contract between a workflows and the before workflow hook:
 * - abort: when true, agent execution is aborted
 * - abort_message: message shown to the user when the workflow aborts the agent
 * - new_prompt: prompt to use for the next conversation round (replaces user message)
 * - model_context: context appended only to model input, not persisted as user-authored text
 */
export interface BeforeAgentWorkflowOutput {
  abort?: boolean;
  abort_message?: string;
  new_prompt?: string;
  model_context?: string;
}

/**
 * Inputs passed to a post-execution workflow. The execution has already been returned to the user,
 * so the workflow's output is ignored.
 */
export interface AfterExecutionWorkflowParams {
  prompt: string;
  response: string;
  conversation_id?: string;
  round_id: string;
  agent_id?: string;
  /** Connector used by the triggering round (`round.model_usage.connector_id`). */
  connector_id?: string;
  tool_calls: Array<{
    tool_id: string;
    tool_call_id: string;
    params: Record<string, unknown>;
  }>;
}
