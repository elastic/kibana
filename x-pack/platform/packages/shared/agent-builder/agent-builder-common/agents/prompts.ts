/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AgentPromptType {
  confirmation = 'confirmation',
  textInput = 'text_input',
  selection = 'selection',
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

export interface ConfirmationPromptResponse {
  allow: boolean;
}

export interface TextInputPromptDefinition {
  id: string;
  title?: string;
  message?: string;
  placeholder?: string;
  submit_text?: string;
  cancel_text?: string;
  is_secret?: boolean;
}

export interface TextInputPrompt extends TextInputPromptDefinition {
  type: AgentPromptType.textInput;
}

export interface TextInputPromptResponse {
  value: string | null;
}

export const isTextInputPrompt = (prompt: PromptRequest): prompt is TextInputPrompt => {
  return prompt.type === AgentPromptType.textInput;
};

export interface SelectionOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface SelectionPromptDefinition {
  id: string;
  title?: string;
  message?: string;
  options: SelectionOption[];
  cancel_text?: string;
}

export interface SelectionPrompt extends SelectionPromptDefinition {
  type: AgentPromptType.selection;
}

export interface SelectionPromptResponse {
  selectedOptionId: string | null;
}

export const isSelectionPrompt = (prompt: PromptRequest): prompt is SelectionPrompt => {
  return prompt.type === AgentPromptType.selection;
};

export type PromptResponse = ConfirmationPromptResponse | TextInputPromptResponse | SelectionPromptResponse;

export interface ConfirmationPrompt extends ConfirmPromptDefinition {
  type: AgentPromptType.confirmation;
}

// all types of prompt
export type PromptRequest = ConfirmationPrompt | TextInputPrompt | SelectionPrompt;

export const isConfirmationPrompt = (prompt: PromptRequest): prompt is ConfirmationPrompt => {
  return prompt.type === AgentPromptType.confirmation;
};

export interface ConfirmationPromptResponseState {
  type: AgentPromptType.confirmation;
  response: ConfirmationPromptResponse;
}

export interface TextInputPromptResponseState {
  type: AgentPromptType.textInput;
  response: TextInputPromptResponse;
}

export interface SelectionPromptResponseState {
  type: AgentPromptType.selection;
  response: SelectionPromptResponse;
}

export type PromptResponseState = ConfirmationPromptResponseState | TextInputPromptResponseState | SelectionPromptResponseState;

/**
 * The internal representation of the prompt storage state for the conversation.
 */
export interface PromptStorageState {
  responses: Record<string, PromptResponseState>;
}
