/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';
import type { ToolCallWithReasoning } from '@kbn/agent-builder-genai-utils/langchain';

export enum AgentActionType {
  Error = 'error',
  ToolCall = 'tool_call',
  ExecuteTool = 'execute_tool',
  ToolPrompt = 'tool_prompt',
  HandOver = 'hand_over',
  Answer = 'answer',
  StructuredAnswer = 'structured_answer',
  BackgroundExecutionComplete = 'background_execution_complete',
}

export interface ToolCallResult {
  toolCallId: string;
  content: string;
  artifact?: any;
}

// research phase actions

export interface AgentErrorAction {
  type: AgentActionType.Error;
  error: AgentBuilderAgentExecutionError;
}

export interface ToolCallAction {
  type: AgentActionType.ToolCall;
  tool_call_group_id: string;
  tool_calls: ToolCallWithReasoning[];
  message?: string;
}

export interface ExecuteToolAction {
  type: AgentActionType.ExecuteTool;
  tool_results: ToolCallResult[];
}

export interface ToolPromptEntry {
  tool_call_id: string;
  prompt: PromptRequest;
}

export interface ToolPromptAction {
  type: AgentActionType.ToolPrompt;
  prompts: ToolPromptEntry[];
}

export interface HandoverAction {
  type: AgentActionType.HandOver;
  /** message of the agent for the handover */
  message: string;
  /** was the handover forced (budget limit) or not */
  forceful: boolean;
}

export interface BackgroundExecutionCompleteAction {
  type: AgentActionType.BackgroundExecutionComplete;
  execution: BackgroundExecutionState;
}

export type ResearchAgentAction =
  | ToolCallAction
  | ExecuteToolAction
  | ToolPromptAction
  | HandoverAction
  | AgentErrorAction
  | BackgroundExecutionCompleteAction;

// answer phase actions

export interface AnswerAction {
  type: AgentActionType.Answer;
  message: string;
}

export interface StructuredAnswerAction {
  type: AgentActionType.StructuredAnswer;
  data: object;
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

export function isToolPromptAction(action: AgentAction): action is ToolPromptAction {
  return action.type === AgentActionType.ToolPrompt;
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

export function isBackgroundExecutionCompleteAction(
  action: AgentAction
): action is BackgroundExecutionCompleteAction {
  return action.type === AgentActionType.BackgroundExecutionComplete;
}

// creation helpers

export function errorAction(error: AgentBuilderAgentExecutionError): AgentErrorAction {
  return {
    type: AgentActionType.Error,
    error,
  };
}

export function toolCallAction(
  toolCalls: ToolCallWithReasoning[],
  message?: string
): ToolCallAction {
  return {
    type: AgentActionType.ToolCall,
    tool_calls: toolCalls,
    tool_call_group_id: uuidv4(),
    message,
  };
}

export function executeToolAction(toolResults: ToolCallResult[]): ExecuteToolAction {
  return {
    type: AgentActionType.ExecuteTool,
    tool_results: toolResults,
  };
}

export function toolPromptAction(prompts: ToolPromptEntry[]): ToolPromptAction {
  return {
    type: AgentActionType.ToolPrompt,
    prompts,
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

export function structuredAnswerAction(data: object): StructuredAnswerAction {
  return {
    type: AgentActionType.StructuredAnswer,
    data,
  };
}

export function backgroundExecutionCompleteAction(
  execution: BackgroundExecutionState
): BackgroundExecutionCompleteAction {
  return {
    type: AgentActionType.BackgroundExecutionComplete,
    execution,
  };
}
