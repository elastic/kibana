/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_COMMENT_LENGTH } from '../../../../constants';

export const AI_RESPONSE_ATTACHMENT_TYPE = 'cases.ai_response' as const;

export const AiResponseAttachmentDataSchema = z
  .object({
    content: z
      .string()
      .max(MAX_COMMENT_LENGTH)
      .refine((value) => value.trim().length > 0, {
        message: 'AI response content must not be empty',
      }),
    agent_id: z.string().optional(),
    skill_id: z.string().optional(),
    conversation_id: z.string().optional(),
    citations: z
      .array(
        z
          .object({
            label: z.string(),
            url: z.string().optional(),
            type: z.string().optional(),
          })
          .strict()
      )
      .optional(),
  })
  .strict();

export const AiResponseAttachmentPayloadSchema = z
  .object({
    type: z.literal(AI_RESPONSE_ATTACHMENT_TYPE),
    owner: z.string(),
    data: AiResponseAttachmentDataSchema,
  })
  .strict();

export type AiResponseAttachmentData = z.infer<typeof AiResponseAttachmentDataSchema>;
export type AiResponseAttachmentPayload = z.infer<typeof AiResponseAttachmentPayloadSchema>;
