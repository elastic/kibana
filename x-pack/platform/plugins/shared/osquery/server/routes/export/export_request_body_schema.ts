/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_FILTER_PARAM_LENGTH } from '../../../common/constants';

/**
 * Shared request body schema for all export routes.
 * Body is nullable so clients may omit it entirely (equivalent to an empty object).
 */
export const exportRequestBodySchema = schema.nullable(
  schema.object({
    /**
     * Optional KQL filter appended to the base action/schedule filter. Shares the query-string
     * limit because exports reuse the KQL the results view sends in its URL.
     */
    kuery: schema.maybe(schema.searchFilter({ maxLength: MAX_FILTER_PARAM_LENGTH })),
    /**
     * Optional agent-id allowlist. When provided only these agents' rows are exported.
     * Capped at 100,000 like osquery's other agent-id lists, above what a default 1 MiB body holds.
     */
    agentIds: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: 1024 }), { maxSize: 100_000 })
    ),
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
  id: schema.string({ maxLength: 1024 }),
  actionId: schema.string({ maxLength: 1024 }),
});

/** Route params schema for the scheduled query export route. */
export const exportScheduledQueryParamsSchema = schema.object({
  scheduleId: schema.string({ maxLength: 1024 }),
  executionCount: schema.number({ min: 0 }),
});
