/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { userMessageEventDataSchema } from './user_message';

const askUserQuestionAnswerSchema = z.object({
  choice: z.array(z.number()).optional(),
  custom: z.string().optional(),
  skipped: z.boolean().optional(),
});

// PromptResponse — union of ConfirmationPromptResponse | AuthorizationPromptResponse | AskUserQuestionPromptResponse
const promptResponseSchema = z.union([
  z.object({ allow: z.boolean() }),
  z.object({ authorized: z.boolean() }),
  z.object({ answers: z.array(askUserQuestionAnswerSchema) }),
]);

export const promptResponseEventDataSchema = z.object({
  prompt_requested_event_id: z.string(),
  responses: z.record(z.string(), promptResponseSchema),
  input: userMessageEventDataSchema.optional(),
});
