/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatAgentExecutionError } from '@kbn/onechat-common/base/errors';
import type { ToolCall } from '@kbn/onechat-genai-utils/langchain';

export enum AgentActionType {
  Error = 'error',
  ToolCall = 'tool_call',
  ExecuteTool = 'execute_tool',
  HandOver = 'hand_over',
  Answer = 'answer',
  StructuredAnswer = 'structured_answer',
}

export interface ToolCallResult {
  toolCallId: string;
  content: string;
  artifact?: any;
}

// research phase actions

export interface AgentErrorAction {
  type: AgentActionType.Error;
  error: OnechatAgentExecutionError;
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
  /** message of the agent for the handover */
  message: string;
  /** was the handover forced (budget limit) or not */
  forceful: boolean;
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

export interface StructuredAnswerAction {
  type: AgentActionType.StructuredAnswer;
  data: unknown;
}

export type AnswerAgentAction = AnswerAction | StructuredAnswerAction | AgentErrorAction;

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

export function isStructuredAnswerAction(action: AgentAction): action is StructuredAnswerAction {
  return action.type === AgentActionType.StructuredAnswer;
}

// creation helpers

export function errorAction(error: OnechatAgentExecutionError): AgentErrorAction {
  return {
    type: AgentActionType.Error,
    error,
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

export function handoverAction(message: string, forceful: boolean = false): HandoverAction {
  return {
    type: AgentActionType.HandOver,
    message,
    forceful,
  };
}

export function answerAction(message: string): AnswerAction {
  return {
    type: AgentActionType.Answer,
    message,
  };
}

export function structuredAnswerAction(data: unknown): StructuredAnswerAction {
  return {
    type: AgentActionType.StructuredAnswer,
    data,
  };
}
