/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
} from './constants';
import type { AiIndexProperties } from './http_api/ai_indices';
import { validateAiIndexId } from './validation';

export const aiIndexDestSchema = z.object({
  type: z.enum(['data_stream', 'index']),
  value: z.string().min(1).max(MAX_AI_INDEX_DEST_VALUE_LENGTH),
});

export const aiIndexAutomationSchema = z.object({
  type: z.literal('workflow'),
  value: z.string().max(MAX_AI_INDEX_AUTOMATION_LENGTH),
});

const aiIndexEsqlSourceSchema = z.object({
  type: z.literal('esql'),
  value: z.string().max(MAX_AI_INDEX_SOURCE_VALUE_LENGTH),
});

const aiIndexConnectorSourceSchema = z.object({
  type: z.literal('connector'),
  value: z.string().min(1).max(MAX_AI_INDEX_SOURCE_VALUE_LENGTH),
});

export const aiIndexSourceSchema = z.discriminatedUnion('type', [
  aiIndexEsqlSourceSchema,
  aiIndexConnectorSourceSchema,
]);

export const aiIndexPropertiesSchema = z.object({
  description: z.string().max(MAX_AI_INDEX_DESCRIPTION_LENGTH).optional(),
  dest: aiIndexDestSchema,
  sources: z.array(aiIndexSourceSchema).max(MAX_AI_INDEX_SOURCES),
  automations: z.array(aiIndexAutomationSchema).max(MAX_AI_INDEX_AUTOMATIONS),
});

export const aiIndexIdFieldSchema = z
  .string()
  .min(1)
  .max(MAX_AI_INDEX_ID_LENGTH)
  .superRefine((value, ctx) => {
    const validationError = validateAiIndexId(value);
    if (validationError) {
      ctx.addIssue({
        code: 'custom',
        message: validationError,
      });
    }
  });

export const aiIndexAttachmentDataSchema = aiIndexPropertiesSchema.extend({
  id: aiIndexIdFieldSchema,
});

/**
 * Snapshot of an AI index attached to an Agent Builder conversation.
 * Matches {@link AiIndexProperties} plus the index id.
 */
export type AiIndexAttachmentData = { id: string } & AiIndexProperties;
