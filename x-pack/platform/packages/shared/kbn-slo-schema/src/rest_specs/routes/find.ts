/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BooleanFromString } from '@kbn/zod-helpers';
import { z, lazySchema } from '@kbn/zod';
import { sloWithDataResponseSchema } from '../slo';

const sortDirectionSchema = lazySchema(() => z.union([z.literal('asc'), z.literal('desc')]));
const sortBySchema = lazySchema(() =>
  z.union([
    z.literal('error_budget_consumed'),
    z.literal('error_budget_remaining'),
    z.literal('sli_value'),
    z.literal('status'),
    z.literal('burn_rate_5m'),
    z.literal('burn_rate_1h'),
    z.literal('burn_rate_1d'),
  ])
);

const searchAfterArraySchema = lazySchema(() => z.array(z.union([z.string(), z.number()])));

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
    filters: z.string().optional(),
    kqlQuery: z.string().optional(),
    // Used for page-based pagination; kept as strings to preserve backward compatibility
    page: z.string().optional(),
    perPage: z.string().optional(),
    sortBy: sortBySchema.optional(),
    sortDirection: sortDirectionSchema.optional(),
    hideStale: BooleanFromString.optional(),
    // Used for cursor-based pagination; searchAfter is a JSON-encoded array
    searchAfter: searchAfterSchema.optional(),
    size: z.string().optional(),
  })
);

const findSLOParamsSchema = lazySchema(() =>
  z.object({
    query: findSLOQuerySchema.optional(),
  })
);

const findSLOResponseSchema = lazySchema(() =>
  z.object({
    page: z.number(),
    perPage: z.number(),
    total: z.number(),
    results: z.array(sloWithDataResponseSchema),
    searchAfter: searchAfterArraySchema.optional(),
    size: z.number().optional(),
  })
);

type FindSLOParams = z.output<typeof findSLOQuerySchema>;
type FindSLOResponse = z.input<typeof findSLOResponseSchema>;

export { findSLOParamsSchema, findSLOResponseSchema };
export type { FindSLOParams, FindSLOResponse };
