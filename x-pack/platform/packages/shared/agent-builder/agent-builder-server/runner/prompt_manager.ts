/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConfirmPromptDefinition,
  ConfirmationStatus,
  TextInputPromptDefinition,
  SelectionPromptDefinition,
  PromptResponseState,
  PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerPromptReturn } from '../tools/handler';

export interface PromptManager {
  set(promptId: string, response: PromptResponseState): void;
  get(promptId: string): PromptResponseState | undefined;
  dump(): PromptStorageState;
  getConfirmationStatus(promptId: string): ConfirmationInfo;
  getTextInputValue(promptId: string): TextInputInfo;
  getSelectionValue(promptId: string): SelectionInfo;
  clear(): void;
  forTool(opts: {
    toolId: string;
    toolCallId?: string;
    toolParams: Record<string, any>;
  }): ToolPromptManager;
}

export interface ConfirmationInfo {
  status: ConfirmationStatus;
}

export interface TextInputInfo {
  status: 'unprompted' | 'submitted' | 'cancelled';
  value?: string;
}

export interface SelectionInfo {
  status: 'unprompted' | 'selected' | 'cancelled';
  selectedOptionId?: string;
}

export interface ToolPromptManager {
  checkConfirmationStatus(promptId: string): ConfirmationInfo;
  checkTextInputStatus(promptId: string): TextInputInfo;
  checkSelectionStatus(promptId: string): SelectionInfo;
  askForConfirmation(opts: ConfirmPromptDefinition): ToolHandlerPromptReturn;
  askForTextInput(opts: TextInputPromptDefinition): ToolHandlerPromptReturn;
  askForSelection(opts: SelectionPromptDefinition): ToolHandlerPromptReturn;
}
