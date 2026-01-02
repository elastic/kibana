/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConfirmationPrompt,
  ConfirmationPromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';

export type ConfirmationPromptWithResponse = ConfirmationPrompt & {
  response: ConfirmationPromptResponse;
};
