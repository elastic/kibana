/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { stateKeySchema } from './bindings';
import {
  CASES_SORT_FIELDS,
  MAX_CASES_FILTER_LENGTH,
  MAX_CASES_LIMIT,
  MAX_QUERY_LENGTH,
} from './constants';

/** An ES|QL query. A component that shows data carries its own. */
export const querySchema = lazySchema(() => z.string().min(1).max(MAX_QUERY_LENGTH));

/** A filter of the cases: a fixed value, or one of the app, so that an input can drive it. */
const casesFilterSchema = lazySchema(() =>
  z.union([z.string().max(MAX_CASES_FILTER_LENGTH), z.object({ fromState: stateKeySchema })])
);

/**
 * The cases the user can see, as an alternative to a query for what a component shows. An empty
 * filter filters nothing, so a select that has an "All" with no value works as it reads.
 */
export const casesSourceSchema = lazySchema(() =>
  z.object({
    type: z.literal('cases'),
    status: casesFilterSchema.optional(),
    severity: casesFilterSchema.optional(),
    search: casesFilterSchema.optional(),
    tag: casesFilterSchema.optional(),
    sort: z.object({ field: z.enum(CASES_SORT_FIELDS), order: z.enum(['asc', 'desc']) }).optional(),
    limit: z.number().int().min(1).max(MAX_CASES_LIMIT).optional(),
    /** Only the cases created in the period of the app. Without it, they are all of them. */
    followTimeRange: z.boolean().optional(),
    /** Only how many cases there are, as one value, for a stat. */
    count: z.boolean().optional(),
  })
);

/** The same fields, with a description of each, for a capability whose manifest has to describe them. */
export const describedDataFields = (shows: string) => ({
  query: querySchema.optional().describe(`An ES|QL query. ${shows}`),
  source: casesSourceSchema
    .optional()
    .describe('Cases in place of a query. Give a query or a source, and one of them only.'),
});
