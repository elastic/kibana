/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CaseObservableBaseSchema } from '../../domain_zod/observable/v1';

export const ObservablePostSchema = CaseObservableBaseSchema;

export const ObservablePatchSchema = z.object({
  value: z.string(),
  description: z.string().nullable(),
});

export const AddObservableRequestSchema = z.object({
  observable: ObservablePostSchema,
});

export const UpdateObservableRequestSchema = z.object({
  observable: ObservablePatchSchema,
});

export const BulkAddObservablesRequestSchema = z.object({
  caseId: z.string(),
  observables: z.array(ObservablePostSchema),
});

export type ObservablePost = z.infer<typeof ObservablePostSchema>;
export type ObservablePatch = z.infer<typeof ObservablePatchSchema>;
export type AddObservableRequest = z.infer<typeof AddObservableRequestSchema>;
export type UpdateObservableRequest = z.infer<typeof UpdateObservableRequestSchema>;
export type BulkAddObservablesRequest = z.infer<typeof BulkAddObservablesRequestSchema>;
