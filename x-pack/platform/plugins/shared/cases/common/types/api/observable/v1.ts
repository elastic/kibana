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
  MAX_CASE_ID_LENGTH,
  MAX_CASES_PER_PAGE,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_METADATA_FILTERS,
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_PAIRS,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_CURSOR_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
  MAX_OBSERVABLES_PER_PAGE,
  MAX_STORED_OBSERVABLE_FIELD_LENGTH,
  MAX_OWNER_LENGTH,
  MIN_BULK_DELETE_OBSERVABLE_IDS,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema, paginationSchema } from '../../../schema';
import { CaseSchema } from '../../domain/case/v1';
import { CaseObservableBaseSchema, CaseObservableSchema } from '../../domain/observable/v1';
import { CasesFindRequestSortFieldsSchema } from '../case/v1';

// The bounds apply to requests only: the domain schema must keep parsing stored observables that predate them.
const BoundedObservableValueSchema = lazySchema(() => z.string().max(MAX_OBSERVABLE_VALUE_LENGTH));
const BoundedObservableDescriptionSchema = lazySchema(() =>
  z.string().max(MAX_OBSERVABLE_DESCRIPTION_LENGTH).nullable()
);

const ObservableMetadataKeySchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_OBSERVABLE_METADATA_KEY_LENGTH)
    // `*` would turn a key into a field pattern when the list filters by it.
    .refine((key) => !key.includes('*'), { message: 'A metadata key cannot contain *' })
);

/**
 * Free-form key/value pairs of an observable value, shared by every case of the space and owner
 * that holds the value.
 */
export const ObservableMetadataSchema = lazySchema(() =>
  z
    .record(
      ObservableMetadataKeySchema,
      z.string().min(1).max(MAX_OBSERVABLE_METADATA_VALUE_LENGTH)
    )
    .refine((metadata) => Object.keys(metadata).length <= MAX_OBSERVABLE_METADATA_PAIRS, {
      message: `An observable value holds at most ${MAX_OBSERVABLE_METADATA_PAIRS} metadata pairs`,
    })
);

export const ObservablePostSchema = lazySchema(() =>
  CaseObservableBaseSchema.extend({
    value: BoundedObservableValueSchema,
    description: BoundedObservableDescriptionSchema,
    /** Merged into the metadata the value already holds. */
    metadata: ObservableMetadataSchema.optional(),
  })
);

// A patch sends back the stored value and description, which can predate the bounds, so it is only held
// to the longest a stored one can be. The client applies the bounds to the fields the patch changes.
export const ObservablePatchSchema = lazySchema(() =>
  z.object({
    value: z.string().max(MAX_STORED_OBSERVABLE_FIELD_LENGTH),
    description: z.string().max(MAX_STORED_OBSERVABLE_FIELD_LENGTH).nullable(),
    /** Leaving it out keeps the value's metadata, an object replaces it and null clears it. */
    metadata: ObservableMetadataSchema.nullable().optional(),
  })
);

/** A metadata filter of the observables list: a key's value, a value prefix or a key's presence. */
export const ObservableMetadataFilterSchema = lazySchema(() =>
  z.object({
    key: ObservableMetadataKeySchema,
    /** Matches the whole value, ignoring case. */
    value: z.string().min(1).max(MAX_OBSERVABLE_METADATA_VALUE_LENGTH).optional(),
    /** Matches the start of the value, ignoring case. */
    prefix: z.string().min(1).max(MAX_OBSERVABLE_METADATA_VALUE_LENGTH).optional(),
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
    /** Metadata filters, all of which must match. */
    metadata: limitedArraySchema({
      codec: ObservableMetadataFilterSchema,
      min: 0,
      max: MAX_OBSERVABLE_METADATA_FILTERS,
      fieldName: 'metadata',
    }).optional(),
  })
);

/** An observable of the list, with the metadata its value holds. */
export const ObservableWithMetadataSchema = lazySchema(() =>
  CaseObservableSchema.extend({
    metadata: z.record(z.string(), z.string()).optional(),
  })
);

export const FindObservablesResponseSchema = lazySchema(() =>
  z.object({
    observables: z.array(ObservableWithMetadataSchema),
    total: z.number(),
    /** Pass it back to get the next page; absent on the last page. */
    cursor: z.string().optional(),
  })
);

/** The cases of an owner holding an observable with the exact type key and value, in either store. */
export const FindCasesByObservableRequestSchema = lazySchema(() =>
  paginationSchema({ maxPerPage: MAX_CASES_PER_PAGE }).extend({
    owner: z.string().min(1).max(MAX_OWNER_LENGTH),
    typeKey: z.string().min(1).max(MAX_OBSERVABLE_TYPE_KEY_LENGTH),
    value: z.string().min(1).max(MAX_OBSERVABLE_VALUE_LENGTH),
    /** A case left out of the results, such as the case the observable was opened from. */
    excludeCaseId: z.string().max(MAX_CASE_ID_LENGTH).optional(),
    sortField: CasesFindRequestSortFieldsSchema.default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
);

export const FindCasesByObservableResponseSchema = lazySchema(() =>
  z.object({
    cases: z.array(CaseSchema),
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
  })
);

/** For each observable, how many cases of the owner hold its exact type key and value. */
export const CountCasesByObservablesRequestSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(MAX_OWNER_LENGTH),
    observables: limitedArraySchema({
      codec: z.object({
        typeKey: z.string().min(1).max(MAX_OBSERVABLE_TYPE_KEY_LENGTH),
        value: z.string().min(1).max(MAX_OBSERVABLE_VALUE_LENGTH),
      }),
      min: 1,
      max: MAX_OBSERVABLES_PER_PAGE,
      fieldName: 'observables',
    }),
    /** A case left out of every count, such as the case the observables belong to. */
    excludeCaseId: z.string().max(MAX_CASE_ID_LENGTH).optional(),
  })
);

export const CountCasesByObservablesResponseSchema = lazySchema(() =>
  z.object({
    counts: z.array(z.object({ typeKey: z.string(), value: z.string(), total: z.number() })),
  })
);

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
export type ObservableMetadata = z.infer<typeof ObservableMetadataSchema>;
export type ObservableMetadataFilter = z.infer<typeof ObservableMetadataFilterSchema>;
export type ObservableWithMetadata = z.infer<typeof ObservableWithMetadataSchema>;
export type FindCasesByObservableRequest = z.input<typeof FindCasesByObservableRequestSchema>;
export type FindCasesByObservableResponse = z.infer<typeof FindCasesByObservableResponseSchema>;
export type CountCasesByObservablesRequest = z.infer<typeof CountCasesByObservablesRequestSchema>;
export type CountCasesByObservablesResponse = z.infer<typeof CountCasesByObservablesResponseSchema>;
