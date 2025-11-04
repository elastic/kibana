/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentExecutionErrorCode } from '@kbn/onechat-common/agents';
import type { ToolCall, ToolCallResult } from '@kbn/onechat-genai-utils/langchain';

export enum AgentActionType {
  Error = 'error',
  ToolCall = 'tool_call',
  ExecuteTool = 'execute_tool',
  HandOver = 'hand_over',
  Answer = 'answer',
}

// research phase actions

export interface AgentErrorAction {
  type: AgentActionType.Error;
  err_code: AgentExecutionErrorCode;
  err_message: string;
}

export interface ToolCallAction {
  type: AgentActionType.ToolCall;
  tool_calls: ToolCall[];
  message?: string;
}

export interface ExecuteToolAction {
  type: AgentActionType.ExecuteTool;
  tool_results: ToolCallResult[];
}

export interface HandoverAction {
  type: AgentActionType.HandOver;
  message: string;
}

export type ResearchAgentAction =
  | ToolCallAction
  | ExecuteToolAction
  | HandoverAction
  | AgentErrorAction;

// answer phase actions

export interface AnswerAction {
  type: AgentActionType.Answer;
  message: string;
}

export type AnswerAgentAction = AnswerAction | AgentErrorAction;

// all possible actions for the agent flow

export type AgentAction = ResearchAgentAction | AnswerAgentAction;

// type guards

export function isAgentErrorAction(action: AgentAction): action is AgentErrorAction {
  return action.type === AgentActionType.Error;
}

export function isToolCallAction(action: AgentAction): action is ToolCallAction {
  return action.type === AgentActionType.ToolCall;
}

export function isExecuteToolAction(action: AgentAction): action is ExecuteToolAction {
  return action.type === AgentActionType.ExecuteTool;
}

export function isHandoverAction(action: AgentAction): action is HandoverAction {
  return action.type === AgentActionType.HandOver;
}

export function isAnswerAction(action: AgentAction): action is AnswerAction {
  return action.type === AgentActionType.Answer;
}

// creation helpers

export function createAgentErrorAction(
  code: AgentExecutionErrorCode,
  message: string
): AgentErrorAction {
  return {
    type: AgentActionType.Error,
    err_code: code,
    err_message: message,
  };
}

export function toolCallAction(toolCalls: ToolCall[], message?: string): ToolCallAction {
  return {
    type: AgentActionType.ToolCall,
    tool_calls: toolCalls,
    message,
  };
}

export function executeToolAction(toolResults: ToolCallResult[]): ExecuteToolAction {
  return {
    type: AgentActionType.ExecuteTool,
    tool_results: toolResults,
  };
}

export function handoverAction(message: string): HandoverAction {
  return {
    type: AgentActionType.HandOver,
    message,
  };
}

export function answerAction(message: string): AnswerAction {
  return {
    type: AgentActionType.Answer,
    message,
  };
}
