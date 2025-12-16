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
  currentCycle: number;
  errorCount: number;
  node: AgentNodeState;
}

export interface ExecuteToolNodeState {
  step: 'execute_tool';
  toolId: string;
  toolCallId: string;
  toolParams: Record<string, unknown>;
}

/** All possible node states */
export type AgentNodeState = ExecuteToolNodeState;
