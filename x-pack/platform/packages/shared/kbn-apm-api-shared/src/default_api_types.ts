/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { either } from 'fp-ts/Either';
import { isoToEpochRt, toNumberRt } from '@kbn/io-ts-utils';
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

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});

export const kueryRt = t.type({ kuery: t.string });

export const probabilityRt = t.type({
  probability: toNumberRt,
});

export const offsetRt = t.partial({
  offset: t.string,
});

export const serviceTransactionDataSourceRt = t.type({
  documentType: t.union([
    t.literal(ApmDocumentType.ServiceTransactionMetric),
    t.literal(ApmDocumentType.TransactionMetric),
    t.literal(ApmDocumentType.TransactionEvent),
  ]),
  rollupInterval: t.union([
    t.literal(RollupInterval.OneMinute),
    t.literal(RollupInterval.TenMinutes),
    t.literal(RollupInterval.SixtyMinutes),
    t.literal(RollupInterval.None),
  ]),
});

export const transactionDataSourceRt = t.type({
  documentType: t.union([
    t.literal(ApmDocumentType.TransactionMetric),
    t.literal(ApmDocumentType.TransactionEvent),
  ]),
  rollupInterval: t.union([
    t.literal(RollupInterval.OneMinute),
    t.literal(RollupInterval.TenMinutes),
    t.literal(RollupInterval.SixtyMinutes),
    t.literal(RollupInterval.None),
  ]),
});

const BoolQueryRt = t.type({
  should: t.array(t.record(t.string, t.unknown)),
  must: t.array(t.record(t.string, t.unknown)),
  must_not: t.array(t.record(t.string, t.unknown)),
  filter: t.array(t.record(t.string, t.unknown)),
});

export const filtersRt = new t.Type<BoolQuery, string, unknown>(
  'BoolQuery',
  BoolQueryRt.is,
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      try {
        const filters = JSON.parse(value);
        const decoded = {
          should: [],
          must: [],
          must_not: filters.must_not ? [...filters.must_not] : [],
          filter: filters.filter ? [...filters.filter] : [],
        };
        return t.success(decoded);
      } catch (err) {
        return t.failure(input, context, err.message);
      }
    }),
  (filters: BoolQuery): string => JSON.stringify(filters)
);

/**
 * zod equivalents of the io-ts codecs above.
 *
 * These are additive: the io-ts exports above still have many
 * still-unconverted io-ts route consumers (via `t.intersection`), so they
 * can't be replaced in place without breaking those routes. Route groups
 * adopt the schema below as they migrate to zod (see elastic/kibana#243355);
 * once every consumer of an io-ts export above has migrated, that export can
 * be deleted.
 */

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

// No reverse (BoolQuery -> string) direction, unlike filtersRt.encode() - zod transforms are one-way.
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
