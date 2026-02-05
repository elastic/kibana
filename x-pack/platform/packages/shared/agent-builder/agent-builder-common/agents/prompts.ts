/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AgentPromptType {
  confirmation = 'confirmation',
  authorization = 'authorization',
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
  authorized = 'authorized',
  unauthorized = 'unauthorized',
}

export interface ConfirmPromptDefinition {
  /** id of the permission to ask confirmation for */
  id: string;
  /** optional title to display for the confirmation prompt */
  title?: string;
  /** optional message to display for the confirmation prompt */
  message?: string;
  /** optional text to display for the confirmation prompt's confirm button */
  confirm_text?: string;
  /** optional text to display for the confirmation prompt's cancel button */
  cancel_text?: string;
}

export interface AuthorizationPromptDefinition {
  connector_id: string;
}

export interface AuthorizationPromptResponse {
  authorized: boolean;
}

export interface ConfirmationPromptResponse {
  allow: boolean;
}

export type PromptResponse = ConfirmationPromptResponse | AuthorizationPromptResponse;

export const isAuthorizationPromptResponse = (
  response: PromptResponse
): response is AuthorizationPromptResponse => {
  return 'authorized' in response;
};

export const isConfirmationPromptResponse = (
  response: PromptResponse
): response is ConfirmationPromptResponse => {
  return 'allow' in response;
};

export interface ConfirmationPrompt extends ConfirmPromptDefinition {
  type: AgentPromptType.confirmation;
}

export interface AuthorizationPrompt extends AuthorizationPromptDefinition {
  type: AgentPromptType.authorization;
}

// all types of prompt
export type PromptRequest = ConfirmationPrompt | AuthorizationPrompt;

export const isConfirmationPrompt = (prompt: PromptRequest): prompt is ConfirmationPrompt => {
  return prompt.type === AgentPromptType.confirmation;
};

export const isAuthorizationPrompt = (prompt: PromptRequest): prompt is AuthorizationPrompt => {
  return prompt.type === AgentPromptType.authorization;
};

export interface ConfirmationPromptResponseState {
  type: AgentPromptType.confirmation;
  response: ConfirmationPromptResponse;
}

export interface AuthorizationPromptResponseState {
  type: AgentPromptType.authorization;
  response: AuthorizationPromptResponse;
}

export type PromptResponseState =
  | ConfirmationPromptResponseState
  | AuthorizationPromptResponseState;

/**
 * The internal representation of the prompt storage state for the conversation.
 */
export interface PromptStorageState {
  responses: Record<string, PromptResponseState>;
}
