/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const CaseObservableBaseSchema = z.object({
  typeKey: z.string(),
  value: z.string(),
  description: z.string().nullable(),
});

export const CaseObservableSchema = CaseObservableBaseSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export const CaseObservableTypeSchema = z.object({
  key: z.string(),
  label: z.string(),
});

export type Observable = z.infer<typeof CaseObservableSchema>;
export type ObservableType = z.infer<typeof CaseObservableTypeSchema>;
