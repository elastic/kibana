/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

const ALL_VALUE = '*';

const allOrAnyString = t.union([t.literal(ALL_VALUE), t.string]);

const allOrAnyStringOrArray = t.union([
  t.literal(ALL_VALUE),
  t.string,
  t.array(t.union([t.literal(ALL_VALUE), t.string])),
]);

const dateType = new t.Type<Date, string, unknown>(
  'DateType',
  (input: unknown): input is Date => input instanceof Date,
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      const decoded = new Date(value);
      return isNaN(decoded.getTime()) ? t.failure(input, context) : t.success(decoded);
    }),
  (date: Date): string => date.toISOString()
);

const errorBudgetSchema = t.type({
  initial: t.number,
  consumed: t.number,
  remaining: t.number,
  isEstimated: t.boolean,
});

const statusSchema = t.union([
  t.literal('NO_DATA'),
  t.literal('HEALTHY'),
  t.literal('DEGRADING'),
  t.literal('VIOLATED'),
]);

const summarySchema = t.type({
  status: statusSchema,
  sliValue: t.number,
  errorBudget: errorBudgetSchema,
});

const groupingsSchema = t.record(t.string, t.union([t.string, t.number]));

const metaSchema = t.partial({
  synthetics: t.type({
    monitorId: t.string,
    locationId: t.string,
    configId: t.string,
  }),
});

const groupSummarySchema = t.type({
  total: t.number,
  worst: t.type({
    sliValue: t.number,
    status: t.string,
    slo: t.type({
      id: t.string,
      instanceId: t.string,
      name: t.string,
    }),
  }),
  violated: t.number,
  healthy: t.number,
  degrading: t.number,
  noData: t.number,
});

const historicalSummarySchema = t.intersection([
  t.type({
    date: dateType,
  }),
  summarySchema,
]);

const dateRangeSchema = t.type({ from: dateType, to: dateType });

const kqlQuerySchema = t.string;

const kqlWithFiltersSchema = t.type({
  kqlQuery: t.string,
  filters: t.array(
    t.type({
      meta: t.partial({
        alias: t.union([t.string, t.null]),
        disabled: t.boolean,
        negate: t.boolean,
        // controlledBy is there to identify who owns the filter
        controlledBy: t.string,
        // allows grouping of filters
        group: t.string,
        // index and type are optional only because when you create a new filter, there are no defaults
        index: t.string,
        isMultiIndex: t.boolean,
        type: t.string,
        key: t.string,
        params: t.any,
        value: t.string,
      }),
      query: t.record(t.string, t.any),
    })
  ),
});

const querySchema = t.union([kqlQuerySchema, kqlWithFiltersSchema]);

export {
  ALL_VALUE,
  allOrAnyString,
  allOrAnyStringOrArray,
  dateRangeSchema,
  dateType,
  errorBudgetSchema,
  groupingsSchema,
  historicalSummarySchema,
  statusSchema,
  summarySchema,
  metaSchema,
  groupSummarySchema,
  kqlWithFiltersSchema,
  querySchema,
  kqlQuerySchema,
};
