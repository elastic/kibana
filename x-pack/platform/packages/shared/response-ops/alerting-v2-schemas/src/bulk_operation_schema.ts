/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import {
  BULK_FILTER_MAX_RESOURCES,
  BULK_QUERY_SAMPLE_SIZE,
  ID_MAX_LENGTH,
  MAX_BULK_ITEMS,
  MAX_KQL_LENGTH,
  MAX_SEARCH_LENGTH,
} from './constants';
import { errorResponseSchema } from './error_response_schema';

export const bulkByIdsSchema = z
  .object({
    ids: z
      .array(z.string().min(1).max(ID_MAX_LENGTH))
      .min(1)
      .max(MAX_BULK_ITEMS)
      .describe('Explicit list of IDs to operate on.'),
  })
  .strict();

export type BulkByIdsParams = z.infer<typeof bulkByIdsSchema>;

export const bulkByQuerySchema = z
  .object({
    filter: z
      .string()
      .trim()
      .min(1)
      .max(MAX_KQL_LENGTH)
      .optional()
      .describe(
        `KQL filter string to match target resources. At most ${BULK_FILTER_MAX_RESOURCES} matching resources are processed per request. Cannot be empty; to target every resource use \`match_all: true\`.`
      ),
    search: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SEARCH_LENGTH)
      .optional()
      .describe(
        'Free-text search string matched against the resource-defined searchable fields. Cannot be empty; to target every resource use `match_all: true`.'
      ),
    match_all: z
      .literal(true)
      .optional()
      .describe(
        'When true, targets every resource. Requires an explicit opt-in. Omitted by default.'
      ),
    force: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When true, executes the operation. When false (default), returns a dry-run preview with `match_count` and a `sample` of matching resource IDs so the client can verify before committing.'
      ),
  })
  .strict()
  .refine((data) => data.filter != null || data.search != null || data.match_all === true, {
    message: 'At least one of filter, search, or match_all must be provided.',
  })
  .refine((data) => data.match_all !== true || (data.filter == null && data.search == null), {
    message: '`match_all` cannot be combined with `filter` or `search`.',
  });

// Use `z.input` so `force` (which has a `.default(false)`) is optional at the
// call site. The server applies the default via the route's Zod parser.
export type BulkByQueryParams = z.input<typeof bulkByQuerySchema>;

/**
 * Error shape for a single resource that failed inside a bulk operation.
 *
 * The nested `error` object reuses `errorResponseSchema` (the same shape
 * returned by single-resource routes on failure) via `.pick`, minus the
 * top-level `error` category label — inside a `200 OK` bulk response there
 * is no HTTP status to mirror, and `code` already conveys the category
 * machine-readably.
 *
 * `code` is a stable, machine-readable identifier scoped to the resource
 * kind (e.g. `RULE_NOT_FOUND`, `ACTION_POLICY_VERSION_CONFLICT`). See the
 * caller's error-code catalog on the server for the canonical list.
 *
 * `details` is optional structured context (e.g. per-field validation
 * issues, the conflicting version, the resource id) that clients can
 * surface without having to parse `message`.
 */
const bulkErrorSchema = z.object({
  id: z.string().describe('The identifier of the resource that failed.'),
  error: errorResponseSchema.pick({ code: true, message: true, details: true }),
});

/**
 * Response shape for an executed bulk operation. Identical across the
 * by-ID bulk routes and the executed (`force: true`) variant of each
 * by-query endpoint, regardless of the underlying resource kind.
 */
export const bulkResponseSchema = z
  .object({
    affected_count: z
      .number()
      .int()
      .nonnegative()
      .describe('Number of resources the operation successfully touched.'),
    errors: z.array(bulkErrorSchema).describe('Errors encountered during the operation.'),
  })
  .describe('Result of an executed bulk operation.');

export type BulkResponse = z.infer<typeof bulkResponseSchema>;

/**
 * Response shape for the dry-run (default) mode of the by-query endpoints.
 * Callers can inspect `match_count` and `sample` to confirm the query
 * targets the intended resources before re-sending with `force: true`.
 */
export const dryRunResponseSchema = z
  .object({
    match_count: z
      .number()
      .int()
      .nonnegative()
      .describe(
        `Total number of resources matching the query. A dry run never fails on size, but if this exceeds ${BULK_FILTER_MAX_RESOURCES}, re-sending the same query with \`force: true\` is rejected with \`BULK_QUERY_MATCH_LIMIT_EXCEEDED\`; narrow the query before executing.`
      ),
    sample: z
      .array(z.string())
      .max(BULK_QUERY_SAMPLE_SIZE)
      .describe(
        `Sample of matching resource IDs (up to ${BULK_QUERY_SAMPLE_SIZE}) for spot-checking before executing.`
      ),
  })
  .describe('Dry-run preview returned by a by-query bulk endpoint when `force` is false.');

export type DryRunResponse = z.infer<typeof dryRunResponseSchema>;

/** Union of dry-run and executed responses returned by the by-query endpoints. */
export const bulkByQueryResultSchema = z.union([dryRunResponseSchema, bulkResponseSchema]);

export type BulkByQueryResult = z.infer<typeof bulkByQueryResultSchema>;
