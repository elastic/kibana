/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfirmPromptDefinition } from '@kbn/onechat-common/agents/prompts';
import type { ToolConfirmationPromptWithResponse } from '../agents/prompts';
import type { ToolHandlerPromptReturn } from '../tools/handler';

export interface PromptManager {
  set(toolCallId: string, prompt: ToolConfirmationPromptWithResponse): void;
  clear(): void;
  forTool(opts: {
    toolId: string;
    toolCallId?: string;
    toolParams: Record<string, any>;
  }): ToolPromptManager;
}

export interface ToolPromptManager {
  // TODO: probably expose a lighter version with only the state and result
  /**
   * Returns the currently pending prompt, if any.
   */
  getPendingPrompt(): ToolConfirmationPromptWithResponse | undefined;
  /**
   * Creates a confirmation prompt which can be returned by the tool handler
   */
  confirm(opts: ConfirmPromptDefinition & { state?: object }): ToolHandlerPromptReturn;
}
