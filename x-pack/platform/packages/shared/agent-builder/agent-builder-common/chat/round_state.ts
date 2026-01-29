/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RoundState {
  version: number;
  agent: AgentState;
}

export interface AgentState {
  current_cycle: number;
  error_count: number;
  node: AgentNodeState;
}

export interface ExecuteToolNodeState {
  step: 'execute_tool';
  tool_call_id: string;
  tool_id: string;
  tool_params: Record<string, unknown>;
  tool_state: unknown | undefined;
}

/** All possible node states */
export type AgentNodeState = ExecuteToolNodeState;
