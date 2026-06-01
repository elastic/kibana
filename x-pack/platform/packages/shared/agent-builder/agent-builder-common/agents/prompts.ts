/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AgentPromptType {
  confirmation = 'confirmation',
  form = 'form',
}

export enum AgentPromptRequestSourceType {
  toolCall = 'tool_call',
}

export interface ToolCallPromptRequestSource {
  type: AgentPromptRequestSourceType.toolCall;
  tool_call_id: string;
}

export type PromptRequestSource = ToolCallPromptRequestSource;

export enum ConfirmationStatus {
  /**
   * the confirmation for the given ID wasn't prompted to the user yet
   */
  unprompted = 'unprompted',
  /**
   * The user confirmed the prompt
   */
  accepted = 'accepted',
  /**
   * The user declined the prompt
   */
  rejected = 'rejected',
}

export type ConfirmPromptColor = 'primary' | 'warning' | 'danger';

export interface ConfirmPromptDefinition {
  /** id of the permission to ask confirmation for */
  id: string;
  /** optional title to display for the confirmation prompt */
  title?: string;
  /** optional markdown body to display in the confirmation prompt */
  message?: string;
  /** optional text to display for the confirmation prompt's confirm button */
  confirm_text?: string;
  /** optional text to display for the confirmation prompt's cancel button */
  cancel_text?: string;
  /** visual color theme for the confirmation card (default: 'warning') */
  color?: ConfirmPromptColor;
}

export interface ConfirmationPromptResponse {
  allow: boolean;
}

export type PromptResponse = ConfirmationPromptResponse;

export interface ConfirmationPrompt extends ConfirmPromptDefinition {
  type: AgentPromptType.confirmation;
}

/** Captures the outer agent's reasoning and intended tool call that triggered the HITL pause. */
export interface AgentContext {
  /** Plain-text reasoning from the last ReasoningStep before the tool call */
  reasoning: string;
  /** Tool ID the agent intended to call */
  intended_tool: string;
  /** Arguments the agent intended to pass to the tool */
  intended_tool_args: Record<string, unknown>;
}

export interface FormPromptRequest {
  type: AgentPromptType.form;
  /** unique id for this prompt, used to correlate with the response */
  id: string;
  /** id of the workflow execution that is paused */
  execution_id: string;
  /** id of the paused step execution instance */
  step_execution_id: string;
  /** message describing what the workflow is asking for */
  message: string;
  /** JSON Schema describing the expected input fields */
  schema: Record<string, unknown>;
  /** Agent reasoning and intended tool call that caused this HITL pause (S5) */
  agent_context?: AgentContext;
  /**
   * Monotonic resume sequence number on the workflow execution at the time this
   * prompt was emitted. The client submits with `expected_resume_seq = resume_seq + 1`;
   * the server uses CAS on `resume_seq` to reject stale submissions atomically.
   */
  resume_seq?: number;
}

export interface FormPromptResponse {
  /** id matching the FormPromptRequest.id */
  id: string;
  /** id of the workflow execution to resume */
  execution_id: string;
  /** submitted form values conforming to FormPromptRequest.schema */
  values: Record<string, unknown>;
  /**
   * Sequence number this submission expects the workflow execution to advance to.
   * Server CAS: only proceeds if `current resume_seq == expected_resume_seq - 1`.
   * Optional for backward compatibility with older clients.
   */
  expected_resume_seq?: number;
}

// all types of prompt
export type PromptRequest = ConfirmationPrompt | FormPromptRequest;

export const isConfirmationPrompt = (prompt: PromptRequest): prompt is ConfirmationPrompt => {
  return prompt.type === AgentPromptType.confirmation;
};

export const isFormPrompt = (prompt: PromptRequest): prompt is FormPromptRequest => {
  return prompt.type === AgentPromptType.form;
};

export interface ConfirmationPromptResponseState {
  type: AgentPromptType.confirmation;
  response: ConfirmationPromptResponse;
}

export interface FormPromptResponseState {
  type: AgentPromptType.form;
  response: FormPromptResponse;
}

export type PromptResponseState = ConfirmationPromptResponseState | FormPromptResponseState;

/**
 * The internal representation of the prompt storage state for the conversation.
 */
export interface PromptStorageState {
  responses: Record<string, PromptResponseState>;
}
