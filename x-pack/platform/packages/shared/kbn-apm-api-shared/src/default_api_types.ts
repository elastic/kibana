/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { isoToEpoch } from '@kbn/zod-helpers/v4';
import type { BoolQuery } from '@kbn/es-query';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';

// Upper bounds for unbounded query-string inputs, to satisfy the CodeQL
// "unbounded string in route validation" rule (DoS hardening). Values are
// generous so they never reject legitimate input.
const MAX_KUERY_LENGTH = 10_000; // KQL expressions can be long
const MAX_FILTERS_LENGTH = 100_000; // serialized ES bool query (JSON string)
const MAX_QUERY_PARAM_LENGTH = 1_024; // short params: ISO/datemath dates, offsets

export const rangeSchema = z.object({
  start: z.string().max(MAX_QUERY_PARAM_LENGTH).transform(isoToEpoch),
  end: z.string().max(MAX_QUERY_PARAM_LENGTH).transform(isoToEpoch),
});

export const kuerySchema = z.object({ kuery: z.string().max(MAX_KUERY_LENGTH) });

export const probabilitySchema = z.object({
  probability: z.coerce.number(),
});

export const offsetSchema = z.object({
  offset: z.string().max(MAX_QUERY_PARAM_LENGTH).optional(),
});

export const serviceTransactionDataSourceSchema = z.object({
  documentType: z.union([
    z.literal(ApmDocumentType.ServiceTransactionMetric),
    z.literal(ApmDocumentType.TransactionMetric),
    z.literal(ApmDocumentType.TransactionEvent),
  ]),
  rollupInterval: z.union([
    z.literal(RollupInterval.OneMinute),
    z.literal(RollupInterval.TenMinutes),
    z.literal(RollupInterval.SixtyMinutes),
    z.literal(RollupInterval.None),
  ]),
});

export const transactionDataSourceSchema = z.object({
  documentType: z.union([
    z.literal(ApmDocumentType.TransactionMetric),
    z.literal(ApmDocumentType.TransactionEvent),
  ]),
  rollupInterval: z.union([
    z.literal(RollupInterval.OneMinute),
    z.literal(RollupInterval.TenMinutes),
    z.literal(RollupInterval.SixtyMinutes),
    z.literal(RollupInterval.None),
  ]),
});

// Parses the JSON-serialised ES query produced on the client into a BoolQuery.
// One-way (no encode direction), unlike the former io-ts `filtersRt`.
export const filtersSchema = z
  .string()
  .max(MAX_FILTERS_LENGTH)
  .transform((value, ctx): BoolQuery => {
    try {
      const filters = JSON.parse(value);
      return {
        should: [],
        must: [],
        must_not: filters.must_not ? [...filters.must_not] : [],
        filter: filters.filter ? [...filters.filter] : [],
      };
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  });
