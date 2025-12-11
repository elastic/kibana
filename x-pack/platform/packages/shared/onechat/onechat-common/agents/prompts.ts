/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AgentPromptType {
  confirmation = 'confirmation',
}

export enum AgentPromptSource {
  tool = 'tool',
}

export interface ConfirmPromptDefinition {
  title?: string;
  message: string;
  confirm_text?: string;
  cancel_text?: string;
}

export interface ConfirmationPromptResponse {
  confirmed: boolean;
}

export interface Prompt {
  type: AgentPromptType;
  source: AgentPromptSource;
  data: object;
  state: object;
}

export interface ConfirmationPrompt extends Prompt {
  type: AgentPromptType.confirmation;
  confirm: ConfirmPromptDefinition;
}

export interface ToolConfirmationPrompt extends ConfirmationPrompt {
  source: AgentPromptSource.tool;
  data: {
    toolId: string;
    toolCallId: string;
    toolParams: Record<string, unknown>;
  };
}

// all types of prompts which can be emitted by an tool
export type ToolPrompt = ToolConfirmationPrompt;

// all types of prompts which can be surfaced to the user
export type AgentPrompt = ToolConfirmationPrompt;

export const isToolConfirmationPrompt = (prompt: AgentPrompt): prompt is ToolConfirmationPrompt => {
  return prompt.source === AgentPromptSource.tool && prompt.type === AgentPromptType.confirmation;
};
