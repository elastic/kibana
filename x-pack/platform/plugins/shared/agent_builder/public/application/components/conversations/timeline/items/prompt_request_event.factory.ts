/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AskUserQuestionPrompt,
  AuthorizationPrompt,
  ConfirmationPrompt,
} from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';

export const createConfirmationPrompt = (
  overrides?: Partial<ConfirmationPrompt>
): ConfirmationPrompt => ({
  type: AgentPromptType.confirmation,
  id: 'prompt-confirmation-1',
  title: 'Delete indices?',
  message: 'The agent wants to delete `logs-2026.09.01` and `logs-2026.09.02`.',
  color: 'warning',
  ...overrides,
});

export const createAuthorizationPrompt = (
  overrides?: Partial<AuthorizationPrompt>
): AuthorizationPrompt => ({
  type: AgentPromptType.authorization,
  id: 'prompt-authorization-1',
  connector_id: 'connector-1',
  connector_name: 'GitHub',
  connector_type: '.github',
  auth_method: 'oauth_authorization_code',
  ...overrides,
});

export const createAskUserQuestionPrompt = (
  overrides?: Partial<AskUserQuestionPrompt>
): AskUserQuestionPrompt => ({
  type: AgentPromptType.ask_user_question,
  id: 'prompt-ask-user-question-1',
  questions: [
    {
      question: 'Which environment are you investigating?',
      options: [{ label: 'Production' }, { label: 'Staging' }, { label: 'Development' }],
      multi_select: false,
    },
  ],
  ...overrides,
});
