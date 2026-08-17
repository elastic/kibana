/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const memoryCategorySchema = z.enum(['profile', 'preferences', 'events', 'trajectories']);

export const memoryTypeSchema = z.enum(['episodic', 'semantic', 'procedural']);

export const recallInputSchema = z.object({
  query: z.string().max(2000).describe('The query text used to retrieve relevant memories.'),
  category: memoryCategorySchema.optional().describe('Limit results to this memory category.'),
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
  category: memoryCategorySchema.optional().describe('Memory category.'),
  type: memoryTypeSchema.optional().describe('Memory type.'),
  tags: z.array(z.string().max(100)).max(20).optional().describe('Optional classification tags.'),
  expires_at: z
    .string()
    .datetime()
    .optional()
    .describe('ISO-8601 datetime after which this memory should no longer be recalled.'),
});
