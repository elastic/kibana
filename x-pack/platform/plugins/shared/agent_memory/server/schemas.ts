/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const memoryCategorySchema = z.enum(['events', 'trajectories', 'procedures']);

export const memoryTagsSchema = z
  .array(z.string().max(100))
  .max(20)
  .describe('Optional exact-match tags for classification and recall filtering.');

export const recallInputSchema = z.object({
  query: z.string().max(2000).describe('The query text used to retrieve relevant memories.'),
  category: memoryCategorySchema.optional().describe('Limit results to this memory category.'),
  tags: memoryTagsSchema
    .optional()
    .describe('Require recalled memories to contain every supplied tag.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of memories to return. Default 10.'),
});

export const rememberInputSchema = z.object({
  title: z
    .string()
    .max(500)
    .describe('Short label for this memory. Displayed to the user and used in keyword search.'),
  description: z
    .string()
    .max(10000)
    .describe('Full content of the memory. Write in clear, complete sentences.'),
  category: memoryCategorySchema.describe('Memory category.'),
  tags: memoryTagsSchema.optional(),
  expires_at: z
    .string()
    .datetime()
    .optional()
    .describe('ISO-8601 datetime after which this memory should no longer be recalled.'),
  scope: z
    .enum(['user', 'space'])
    .default('user')
    .describe(
      "'user' (default) keeps this memory private to you. " +
        "'space' shares it with everyone who has Agent Memory access in this Kibana space. " +
        "Use 'space' only for durable, team-relevant knowledge: workarounds, runbook entries, " +
        'proposal outcomes, environment quirks.'
    ),
  used_memory_ids: z
    .array(z.string().max(512))
    .max(20)
    .optional()
    .describe(
      'IDs of recalled memories that informed this write (optional). ' +
        'Attribution-grade only — the model self-reports; do not rely on this for security checks.'
    ),
});

export const forgetInputSchema = z.object({
  id: z
    .string()
    .max(512)
    .describe('The memory id to soft-delete. Obtain this from a prior recall call.'),
});
