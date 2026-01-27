/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConfirmPromptDefinition,
  ConfirmationStatus,
  PromptResponseState,
  PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerPromptReturn } from '../tools/handler';

export interface PromptManager {
  set(promptId: string, response: PromptResponseState): void;
  get(promptId: string): PromptResponseState | undefined;
  dump(): PromptStorageState;
  getConfirmationStatus(promptId: string): ConfirmationInfo;
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

export interface ToolPromptManager {
  /**
   * Get the status for the given confirmation prompt
   */
  checkConfirmationStatus(promptId: string): ConfirmationInfo;
  /**
   * Creates a confirmation prompt which can be returned by the tool handler
   */
  askForConfirmation(opts: ConfirmPromptDefinition): ToolHandlerPromptReturn;
}
