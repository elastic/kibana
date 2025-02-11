/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const esMatchQuerySchema = z.object({
  match: z.record(
    z.string(),
    z.object({
      query: z.string(),
      operator: z.string(),
      zero_terms_query: z.string(),
    })
  ),
});

export type ESMatchQuery = z.infer<typeof esMatchQuerySchema>;

const esQueryStringQuerySchema = z.object({
  query_string: z.object({
    query: z.string(),
    analyze_wildcard: z.boolean(),
  }),
});

export type ESQueryStringQuery = z.infer<typeof esQueryStringQuerySchema>;

const esTermQuerySchema = z.object({
  term: z.record(z.string(), z.string()),
});

export type ESTermQuery = z.infer<typeof esTermQuerySchema>;

const esBoolQuerySchema = z.object({
  bool: z.object({
    filter: z.array(z.object({})),
    must: z.array(z.object({})),
    must_not: z.array(z.object({})),
    should: z.array(z.object({})),
  }),
});

export type ESBoolQuery = z.infer<typeof esBoolQuerySchema>;

const esRangeQuerySchema = z.object({
  range: z.record(
    z.string(),
    z.object({
      gte: z.number(),
      lte: z.number(),
      format: z.string(),
    })
  ),
});

export type ESRangeQuery = z.infer<typeof esRangeQuerySchema>;

const jsonObjectSchema = z.record(z.string(), z.any());

export type JsonObject = z.infer<typeof jsonObjectSchema>;

export type ESQuery =
  | ESRangeQuery
  | ESQueryStringQuery
  | ESMatchQuery
  | ESTermQuery
  | ESBoolQuery
  | JsonObject;

const esQuerySchema = z.union([
  esRangeQuerySchema,
  esQueryStringQuerySchema,
  esMatchQuerySchema,
  esTermQuerySchema,
  esBoolQuerySchema,
  jsonObjectSchema,
]);

export const filterQuery = z.union([z.string(), z.undefined(), esQuerySchema]);
