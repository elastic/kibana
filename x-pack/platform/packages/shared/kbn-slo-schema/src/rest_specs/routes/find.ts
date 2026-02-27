/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toBooleanRt } from '@kbn/io-ts-utils';
import { either, isRight } from 'fp-ts/Either';
import * as t from 'io-ts';
import { sloWithDataResponseSchema } from '../slo';

const sortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);
const sortBySchema = t.union([
  t.literal('error_budget_consumed'),
  t.literal('error_budget_remaining'),
  t.literal('sli_value'),
  t.literal('status'),
  t.literal('burn_rate_5m'),
  t.literal('burn_rate_1h'),
  t.literal('burn_rate_1d'),
]);

const searchAfterArraySchema = t.array(t.union([t.string, t.number]));
type SearchAfterArray = t.TypeOf<typeof searchAfterArraySchema>;

const searchAfterSchema = new t.Type<SearchAfterArray, string, unknown>(
  'SearchAfter',
  (input: unknown): input is SearchAfterArray =>
    Array.isArray(input) &&
    input.length > 0 &&
    input.every((item) => typeof item === 'string' || typeof item === 'number'),
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      try {
        const parsedValue = JSON.parse(value);
        const decoded = searchAfterArraySchema.decode(parsedValue);
        if (isRight(decoded)) {
          return t.success(decoded.right);
        }
        return t.failure(
          input,
          context,
          'Invalid searchAfter value, must be a JSON array of strings or numbers'
        );
      } catch (err) {
        return t.failure(
          input,
          context,
          'Invalid searchAfter value, must be a JSON array of strings or numbers'
        );
      }
    }),
  (input: SearchAfterArray): string => JSON.stringify(input)
);

const findSLOParamsSchema = t.partial({
  query: t.partial({
    filters: t.string,
    kqlQuery: t.string,
    // Used for page pagination
    page: t.string,
    perPage: t.string,
    sortBy: sortBySchema,
    sortDirection: sortDirectionSchema,
    hideStale: toBooleanRt,
    // Used for cursor pagination, searchAfter is a JSON array
    searchAfter: searchAfterSchema,
    size: t.string,
  }),
});

const findSLOResponseSchema = t.intersection([
  t.type({
    page: t.number,
    perPage: t.number,
    total: t.number,
    results: t.array(sloWithDataResponseSchema),
  }),
  t.partial({ searchAfter: searchAfterArraySchema, size: t.number }),
]);

type FindSLOParams = t.TypeOf<typeof findSLOParamsSchema.props.query>;
type FindSLOResponse = t.OutputOf<typeof findSLOResponseSchema>;

export { findSLOParamsSchema, findSLOResponseSchema };
export type { FindSLOParams, FindSLOResponse };
