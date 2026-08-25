/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '../tools/tool_result';

export enum AgentPromptType {
  confirmation = 'confirmation',
  authorization = 'authorization',
  ask_user_question = 'ask_user_question',
  browser_tool_result = 'browser_tool_result',
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

export enum AuthorizationStatus {
  unprompted = 'unprompted',
  authorized = 'authorized',
  declined = 'declined',
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

export const AUTHORIZATION_METHODS = ['oauth_authorization_code', 'ears'] as const;

export type AuthorizationMethod = (typeof AUTHORIZATION_METHODS)[number];

export const isAuthorizationMethod = (value: unknown): value is AuthorizationMethod =>
  typeof value === 'string' && (AUTHORIZATION_METHODS as readonly string[]).includes(value);

export interface AuthorizationPromptDefinition {
  id: string;
  connector_id: string;
  connector_name: string;
  connector_type: string;
  auth_method: AuthorizationMethod;
}

// Ask user question

export interface AskUserQuestionPromptDefinition {
  id: string;
  questions: AskUserQuestionItem[];
}

export interface AskUserQuestionItem {
  question: string;
  options: AskUserQuestionOption[];
  multi_select: boolean;
}

export interface AskUserQuestionOption {
  label: string;
  description?: string;
}

export interface AskUserQuestionAnswer {
  /** Selected option indices (in `questions[i].options`). For single-select questions: at most one entry. */
  choice?: number[];
  /** Free-text answer. Allowed alongside `choice`. */
  custom?: string;
  /** True when the user explicitly skipped this question. Mutually exclusive with `choice` / `custom`. */
  skipped?: boolean;
}

export interface ConfirmationPromptResponse {
  allow: boolean;
}

export interface AuthorizationPromptResponse {
  authorized: boolean;
}

export interface AskUserQuestionPromptResponse {
  answers: AskUserQuestionAnswer[];
}

/**
 * Client response for a two-way browser tool interrupt.
 * Carries structured tool results.
 */
export interface BrowserToolResultPromptResponse {
  ok: boolean;
  results?: Array<Omit<ToolResult, 'tool_result_id'> & { tool_result_id?: string }>;
  error?: string;
}

export type PromptResponse =
  | ConfirmationPromptResponse
  | AuthorizationPromptResponse
  | AskUserQuestionPromptResponse
  | BrowserToolResultPromptResponse;

export const isConfirmationPromptResponse = (
  response: PromptResponse
): response is ConfirmationPromptResponse => {
  return 'allow' in response;
};

export const isAuthorizationPromptResponse = (
  response: PromptResponse
): response is AuthorizationPromptResponse => {
  return 'authorized' in response;
};

export const isAskUserQuestionPromptResponse = (
  response: PromptResponse
): response is AskUserQuestionPromptResponse => {
  return 'answers' in response;
};

export const isBrowserToolResultPromptResponse = (
  response: PromptResponse
): response is BrowserToolResultPromptResponse => {
  return (
    'ok' in response &&
    typeof (response as BrowserToolResultPromptResponse).ok === 'boolean' &&
    !('allow' in response) &&
    !('authorized' in response) &&
    !('answers' in response)
  );
};

export interface ConfirmationPrompt extends ConfirmPromptDefinition {
  type: AgentPromptType.confirmation;
}

export interface AuthorizationPrompt extends AuthorizationPromptDefinition {
  type: AgentPromptType.authorization;
}

export interface AskUserQuestionPrompt extends AskUserQuestionPromptDefinition {
  type: AgentPromptType.ask_user_question;
}

export interface BrowserToolResultPromptDefinition {
  id: string;
  tool_id: string;
  tool_call_id: string;
  /** Validated params the LLM passed to the browser tool. */
  params: Record<string, unknown>;
}

export interface BrowserToolResultPrompt extends BrowserToolResultPromptDefinition {
  type: AgentPromptType.browser_tool_result;
}

export type PromptRequest =
  | ConfirmationPrompt
  | AuthorizationPrompt
  | AskUserQuestionPrompt
  | BrowserToolResultPrompt;

export const isConfirmationPrompt = (prompt: PromptRequest): prompt is ConfirmationPrompt => {
  return prompt.type === AgentPromptType.confirmation;
};

export const isAuthorizationPrompt = (prompt: PromptRequest): prompt is AuthorizationPrompt => {
  return prompt.type === AgentPromptType.authorization;
};

export const isAskUserQuestionPrompt = (prompt: PromptRequest): prompt is AskUserQuestionPrompt => {
  return prompt.type === AgentPromptType.ask_user_question;
};

export const isBrowserToolResultPrompt = (
  prompt: PromptRequest
): prompt is BrowserToolResultPrompt => {
  return prompt.type === AgentPromptType.browser_tool_result;
};

export interface ConfirmationPromptResponseState {
  type: AgentPromptType.confirmation;
  response: ConfirmationPromptResponse;
}

export interface AuthorizationPromptResponseState {
  type: AgentPromptType.authorization;
  response: AuthorizationPromptResponse;
}

export interface AskUserQuestionPromptResponseState {
  type: AgentPromptType.ask_user_question;
  response: AskUserQuestionPromptResponse;
}

export interface BrowserToolResultPromptResponseState {
  type: AgentPromptType.browser_tool_result;
  response: BrowserToolResultPromptResponse;
}

export type PromptResponseState =
  | ConfirmationPromptResponseState
  | AuthorizationPromptResponseState
  | AskUserQuestionPromptResponseState
  | BrowserToolResultPromptResponseState;

/**
 * The internal representation of the prompt storage state for the conversation.
 */
export interface PromptStorageState {
  responses: Record<string, PromptResponseState>;
}
