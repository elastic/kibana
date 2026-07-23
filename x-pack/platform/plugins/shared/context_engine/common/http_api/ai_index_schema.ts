/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const aiIndexTypeSchema = z.enum(['data_stream', 'index']);

const aiIndexDestSchema = z.object({
  type: aiIndexTypeSchema,
  value: z.string(),
});

const aiIndexSourceSchema = z.object({
  type: z.literal('esql'),
  value: z.string(),
});

const aiIndexAutomationSchema = z.object({
  type: z.literal('workflow'),
  value: z.string(),
});

export const aiIndexHttpItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  dest: aiIndexDestSchema,
  automations: z.array(aiIndexAutomationSchema),
  sources: z.array(aiIndexSourceSchema),
  date_created: z.string(),
  date_modified: z.string(),
});

export const getAiIndexJsonSchema = (): object =>
  z.toJSONSchema(aiIndexHttpItemSchema, { reused: 'inline' });
