/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_OBSERVABLES_BULK_CREATE,
  MAX_OBSERVABLES_FIND_PER_PAGE,
  MAX_OBSERVABLES_PER_CASE,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MIN_BULK_DELETE_OBSERVABLE_IDS,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema } from '../../../schema';
import { CaseObservableSchema, ObservableMetadataSchema } from '../../domain/observable/v1';

export const ObservablePostSchema = lazySchema(() =>
  z.object({
    typeKey: z.string().max(MAX_OBSERVABLE_TYPE_KEY_LENGTH),
    value: z.string().max(MAX_OBSERVABLE_VALUE_LENGTH),
    description: z.string().max(MAX_OBSERVABLE_DESCRIPTION_LENGTH).nullable(),
    metadata: ObservableMetadataSchema.optional(),
  })
);

export const ObservablePatchSchema = lazySchema(() =>
  z.object({
    value: z.string().max(MAX_OBSERVABLE_VALUE_LENGTH),
    description: z.string().max(MAX_OBSERVABLE_DESCRIPTION_LENGTH).nullable(),
    /** Absent keeps the metadata, an object replaces it and `null` clears it. */
    metadata: ObservableMetadataSchema.nullable().optional(),
  })
);

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

const BoundedObservableIdSchema = limitedStringSchema({
  fieldName: 'observableId',
  min: 1,
  max: OBSERVABLE_ID_MAX_LENGTH,
});

export const BulkDeleteObservablesRequestSchema = z.object({
  caseId: z.string(),
  observableIds: limitedArraySchema({
    codec: BoundedObservableIdSchema,
    min: MIN_BULK_DELETE_OBSERVABLE_IDS,
    max: MAX_OBSERVABLES_PER_CASE,
    fieldName: 'observableIds',
  }),
});

export const BulkCreateObservablesRequestSchema = lazySchema(() =>
  z.object({
    observables: limitedArraySchema({
      codec: ObservablePostSchema,
      min: 1,
      max: MAX_OBSERVABLES_BULK_CREATE,
      fieldName: 'observables',
    }),
  })
);

export const BulkCreateObservablesResponseSchema = lazySchema(() =>
  z.object({
    added: z.number(),
    duplicates: z.number(),
    over_cap: z.number(),
    total_observables: z.number(),
  })
);

export const FindObservablesRequestSchema = lazySchema(() =>
  z.object({
    perPage: z.number().int().min(1).max(MAX_OBSERVABLES_FIND_PER_PAGE).default(20),
    cursor: z.string().max(1_024).optional(),
    sortField: z.enum(['createdAt', 'value', 'typeKey']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    typeKeys: z
      .array(z.string().max(MAX_OBSERVABLE_TYPE_KEY_LENGTH))
      .max(MAX_OBSERVABLES_PER_CASE)
      .optional(),
    search: z.string().max(MAX_OBSERVABLE_VALUE_LENGTH).optional(),
  })
);

export const FindObservablesResponseSchema = lazySchema(() =>
  z.object({
    observables: z.array(CaseObservableSchema),
    total: z.number(),
    cursor: z.string().optional(),
  })
);

export type ObservablePost = z.infer<typeof ObservablePostSchema>;
export type ObservablePatch = z.infer<typeof ObservablePatchSchema>;
export type AddObservableRequest = z.infer<typeof AddObservableRequestSchema>;
export type UpdateObservableRequest = z.infer<typeof UpdateObservableRequestSchema>;
export type BulkAddObservablesRequest = z.infer<typeof BulkAddObservablesRequestSchema>;
export type BulkDeleteObservablesRequest = z.infer<typeof BulkDeleteObservablesRequestSchema>;
export type BulkCreateObservablesRequest = z.input<typeof BulkCreateObservablesRequestSchema>;
export type BulkCreateObservablesResponse = z.infer<typeof BulkCreateObservablesResponseSchema>;
export type FindObservablesRequest = z.input<typeof FindObservablesRequestSchema>;
export type FindObservablesResponse = z.infer<typeof FindObservablesResponseSchema>;
