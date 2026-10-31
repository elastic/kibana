/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import {
  DEFAULT_OBSERVABLES_PER_PAGE,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLES_CURSOR_LENGTH,
  MAX_OBSERVABLES_FIND_TYPE_KEYS,
  MAX_OBSERVABLES_PER_CASE,
  MAX_OBSERVABLES_PER_PAGE,
  MIN_BULK_DELETE_OBSERVABLE_IDS,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedNumberSchema, limitedStringSchema } from '../../../schema';
import { CaseObservableBaseSchema, CaseObservableSchema } from '../../domain/observable/v1';

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

export const FindObservablesSortFieldSchema = lazySchema(() =>
  z.enum(['created', 'updated', 'value', 'type'])
);
export const FindObservablesSortOrderSchema = lazySchema(() => z.enum(['asc', 'desc']));

export const FindObservablesRequestSchema = lazySchema(() =>
  z.object({
    typeKeys: limitedArraySchema({
      codec: limitedStringSchema({
        fieldName: 'typeKeys',
        min: 1,
        max: MAX_OBSERVABLE_TYPE_KEY_LENGTH,
      }),
      min: 0,
      max: MAX_OBSERVABLES_FIND_TYPE_KEYS,
      fieldName: 'typeKeys',
    }).optional(),
    sortField: FindObservablesSortFieldSchema.default('created'),
    sortOrder: FindObservablesSortOrderSchema.default('asc'),
    perPage: limitedNumberSchema({
      fieldName: 'perPage',
      min: 1,
      max: MAX_OBSERVABLES_PER_PAGE,
    }).default(DEFAULT_OBSERVABLES_PER_PAGE),
    /** The cursor of the previous page, to be sent back unchanged. */
    cursor: limitedStringSchema({
      fieldName: 'cursor',
      min: 1,
      max: MAX_OBSERVABLES_CURSOR_LENGTH,
    }).optional(),
  })
);

export const FindObservablesResponseSchema = lazySchema(() =>
  z.object({
    observables: z.array(CaseObservableSchema),
    /** The number of observables of the case that match the filters. */
    total: z.number(),
    /** Absent on the last page. */
    cursor: z.string().optional(),
  })
);

export type ObservablePost = z.infer<typeof ObservablePostSchema>;
export type ObservablePatch = z.infer<typeof ObservablePatchSchema>;
export type AddObservableRequest = z.infer<typeof AddObservableRequestSchema>;
export type UpdateObservableRequest = z.infer<typeof UpdateObservableRequestSchema>;
export type BulkAddObservablesRequest = z.infer<typeof BulkAddObservablesRequestSchema>;
export type BulkDeleteObservablesRequest = z.infer<typeof BulkDeleteObservablesRequestSchema>;
export type FindObservablesSortField = z.infer<typeof FindObservablesSortFieldSchema>;
export type FindObservablesSortOrder = z.infer<typeof FindObservablesSortOrderSchema>;
export type FindObservablesRequest = z.input<typeof FindObservablesRequestSchema>;
export type FindObservablesParams = z.output<typeof FindObservablesRequestSchema>;
export type FindObservablesResponse = z.infer<typeof FindObservablesResponseSchema>;
