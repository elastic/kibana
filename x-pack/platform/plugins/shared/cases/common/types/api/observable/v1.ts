/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import {
  DEFAULT_OBSERVABLES_PER_PAGE,
  MAX_BULK_CREATE_OBSERVABLES,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_CURSOR_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
  MAX_OBSERVABLES_PER_PAGE,
  MAX_STORED_OBSERVABLE_FIELD_LENGTH,
  MIN_BULK_DELETE_OBSERVABLE_IDS,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema } from '../../../schema';
import { CaseObservableBaseSchema, CaseObservableSchema } from '../../domain/observable/v1';

// The bounds apply to requests only: the domain schema must keep parsing stored observables that predate them.
const BoundedObservableValueSchema = lazySchema(() => z.string().max(MAX_OBSERVABLE_VALUE_LENGTH));
const BoundedObservableDescriptionSchema = lazySchema(() =>
  z.string().max(MAX_OBSERVABLE_DESCRIPTION_LENGTH).nullable()
);

export const ObservablePostSchema = lazySchema(() =>
  CaseObservableBaseSchema.extend({
    value: BoundedObservableValueSchema,
    description: BoundedObservableDescriptionSchema,
  })
);

// A patch sends back the stored value and description, which can predate the bounds, so it is only held
// to the longest a stored one can be. The client applies the bounds to the fields the patch changes.
export const ObservablePatchSchema = lazySchema(() =>
  z.object({
    value: z.string().max(MAX_STORED_OBSERVABLE_FIELD_LENGTH),
    description: z.string().max(MAX_STORED_OBSERVABLE_FIELD_LENGTH).nullable(),
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
      max: MAX_BULK_CREATE_OBSERVABLES,
      fieldName: 'observables',
    }),
  })
);

/** What a bulk create added, and what it skipped as a repeat or because the case was full. */
export const BulkCreateObservablesResponseSchema = lazySchema(() =>
  z.object({
    added: z.array(CaseObservableSchema),
    skipped_duplicates: z.array(CaseObservableBaseSchema),
    skipped_over_cap: z.array(CaseObservableBaseSchema),
    total_observables: z.number(),
  })
);

export const ObservablesSortFieldSchema = lazySchema(() =>
  z.enum(['createdAt', 'value', 'typeKey'])
);

export const FindObservablesRequestSchema = lazySchema(() =>
  z.object({
    perPage: z
      .number()
      .int()
      .min(1)
      .max(MAX_OBSERVABLES_PER_PAGE)
      .default(DEFAULT_OBSERVABLES_PER_PAGE),
    cursor: z.string().max(MAX_OBSERVABLES_CURSOR_LENGTH).optional(),
    sortField: ObservablesSortFieldSchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    typeKeys: limitedArraySchema({
      codec: z.string().max(MAX_OBSERVABLE_TYPE_KEY_LENGTH),
      min: 0,
      max: MAX_OBSERVABLES_PER_CASE,
      fieldName: 'typeKeys',
    }).optional(),
    /** Matches the start of the value, ignoring case. */
    search: z.string().max(MAX_OBSERVABLE_VALUE_LENGTH).optional(),
  })
);

export const FindObservablesResponseSchema = lazySchema(() =>
  z.object({
    observables: z.array(CaseObservableSchema),
    total: z.number(),
    /** Pass it back to get the next page; absent on the last page. */
    cursor: z.string().optional(),
  })
);

/** `gte` when more cases hold the observables than the search kept, so `total` is a minimum. */
export const CasesTotalRelationSchema = lazySchema(() => z.enum(['eq', 'gte']));

export type ObservablePost = z.infer<typeof ObservablePostSchema>;
export type ObservablePatch = z.infer<typeof ObservablePatchSchema>;
export type AddObservableRequest = z.infer<typeof AddObservableRequestSchema>;
export type UpdateObservableRequest = z.infer<typeof UpdateObservableRequestSchema>;
export type BulkAddObservablesRequest = z.infer<typeof BulkAddObservablesRequestSchema>;
export type BulkDeleteObservablesRequest = z.infer<typeof BulkDeleteObservablesRequestSchema>;
export type BulkCreateObservablesRequest = z.infer<typeof BulkCreateObservablesRequestSchema>;
export type BulkCreateObservablesResponse = z.infer<typeof BulkCreateObservablesResponseSchema>;
export type ObservablesSortField = z.infer<typeof ObservablesSortFieldSchema>;
export type FindObservablesRequest = z.input<typeof FindObservablesRequestSchema>;
export type FindObservablesResponse = z.infer<typeof FindObservablesResponseSchema>;
export type CasesTotalRelation = z.infer<typeof CasesTotalRelationSchema>;
