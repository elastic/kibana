/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Shared request body schema for all export routes.
 * Body is nullable so clients may omit it entirely (equivalent to an empty object).
 */
export const exportRequestBodySchema = schema.nullable(
  schema.object({
    /** Optional KQL filter appended to the base action/schedule filter. */
    kuery: schema.maybe(schema.string()),
    /** Optional agent-id allowlist. When provided only these agents' rows are exported. */
    agentIds: schema.maybe(schema.arrayOf(schema.string())),
    /** Optional SearchBar filter pills serialised as a JSON array. Capped at 100 to limit DoS surface. */
    esFilters: schema.maybe(schema.arrayOf(schema.any(), { maxSize: 100 })),
  })
);

export type ExportRequestBody = NonNullable<typeof exportRequestBodySchema.type>;

/** Shared query-string schema for all export routes. */
export const exportQuerySchema = schema.object({
  format: schema.oneOf([schema.literal('ndjson'), schema.literal('json'), schema.literal('csv')]),
});

/** Route params schema for the live query export route. */
export const exportLiveQueryParamsSchema = schema.object({
  id: schema.string(),
  actionId: schema.string(),
});

/** Route params schema for the scheduled query export route. */
export const exportScheduledQueryParamsSchema = schema.object({
  scheduleId: schema.string(),
  executionCount: schema.number({ min: 0 }),
});
