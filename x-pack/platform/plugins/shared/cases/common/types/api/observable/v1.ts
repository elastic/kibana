/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
  MIN_BULK_DELETE_OBSERVABLE_IDS,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema } from '../../../schema';
import { CaseObservableBaseSchema } from '../../domain/observable/v1';

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

export const ObservablePatchSchema = lazySchema(() =>
  z.object({
    value: BoundedObservableValueSchema,
    description: BoundedObservableDescriptionSchema,
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

export type ObservablePost = z.infer<typeof ObservablePostSchema>;
export type ObservablePatch = z.infer<typeof ObservablePatchSchema>;
export type AddObservableRequest = z.infer<typeof AddObservableRequestSchema>;
export type UpdateObservableRequest = z.infer<typeof UpdateObservableRequestSchema>;
export type BulkAddObservablesRequest = z.infer<typeof BulkAddObservablesRequestSchema>;
export type BulkDeleteObservablesRequest = z.infer<typeof BulkDeleteObservablesRequestSchema>;
