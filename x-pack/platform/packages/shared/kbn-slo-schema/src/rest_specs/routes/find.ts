/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BooleanFromString } from '@kbn/zod-helpers';
import { z, lazySchema } from '@kbn/zod';
import { sloWithDataResponseSchema } from '../slo';

const sortDirectionSchema = z.union([z.literal('asc'), z.literal('desc')]);
const sortBySchema = z.union([
  z.literal('error_budget_consumed'),
  z.literal('error_budget_remaining'),
  z.literal('sli_value'),
  z.literal('status'),
  z.literal('burn_rate_5m'),
  z.literal('burn_rate_1h'),
  z.literal('burn_rate_1d'),
]);

const searchAfterArraySchema = z.array(z.union([z.string(), z.number()]));

// Codec: wire form is a JSON-encoded string; decoded form is the parsed array.
const searchAfterSchema = z.codec(
  z
    .string()
    .describe('A JSON-encoded array of strings or numbers used for cursor-based pagination'),
  searchAfterArraySchema,
  {
    decode: (value, payload) => {
      const fail = () => {
        payload.issues.push({
          code: 'custom',
          message: 'Invalid searchAfter value, must be a JSON array of strings or numbers',
          input: value,
        });
        return z.NEVER;
      };
      try {
        const result = searchAfterArraySchema.safeParse(JSON.parse(value));
        return result.success ? result.data : fail();
      } catch {
        return fail();
      }
    },
    encode: (value) => JSON.stringify(value),
  }
);

const findSLOQuerySchema = lazySchema(() =>
  z.object({
    filters: z
      .string()
      .optional()
      .describe('A JSON-encoded Elasticsearch query DSL filter to apply to the SLO summaries'),
    kqlQuery: z.string().optional().describe('A valid kql query to filter the SLO with'),
    // Used for page-based pagination; kept as strings to preserve backward compatibility
    page: z
      .string()
      .optional()
      .describe('The page to use for pagination, must be greater or equal than 1'),
    perPage: z.string().optional().describe('Number of SLOs returned by page'),
    sortBy: sortBySchema.optional().describe('Sort by field'),
    sortDirection: sortDirectionSchema.optional().describe('Sort order'),
    hideStale: BooleanFromString.optional().describe(
      'Hide stale SLOs from the list as defined by stale SLO threshold in SLO settings'
    ),
    // Used for cursor-based pagination; searchAfter is a JSON-encoded array
    searchAfter: searchAfterSchema
      .optional()
      .describe(
        'The cursor to use for fetching the results from, when using a cursor-based pagination.'
      ),
    size: z
      .string()
      .optional()
      .describe(
        'The page size to use for cursor-based pagination, must be greater or equal than 1'
      ),
  })
);

const findSLOParamsSchema = z.object({
  query: findSLOQuerySchema.optional(),
});

const findSLOResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  results: z.array(sloWithDataResponseSchema),
  searchAfter: searchAfterArraySchema.optional(),
  size: z.number().optional(),
});

type FindSLOParams = z.output<typeof findSLOQuerySchema>;
type FindSLOResponse = z.input<typeof findSLOResponseSchema>;

export { findSLOParamsSchema, findSLOResponseSchema };
export type { FindSLOParams, FindSLOResponse };
