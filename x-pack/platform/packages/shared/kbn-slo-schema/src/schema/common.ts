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

const summarySchema = t.intersection([
  t.type({
    status: statusSchema,
    sliValue: t.number,
    errorBudget: errorBudgetSchema,
    fiveMinuteBurnRate: t.number,
    oneHourBurnRate: t.number,
    oneDayBurnRate: t.number,
  }),
  t.partial({
    summaryUpdatedAt: t.union([t.string, t.null]),
  }),
]);

const groupingsSchema = t.record(t.string, t.union([t.string, t.number]));

const metaSchema = t.partial({
  synthetics: t.type({
    monitorId: t.string,
    locationId: t.string,
    configId: t.string,
  }),
});

const remoteSchema = t.type({
  remoteName: t.string,
  kibanaUrl: t.string,
});

const groupSummarySchema = t.type({
  total: t.number,
  worst: t.type({
    sliValue: t.number,
    status: t.string,
    slo: t.intersection([
      t.type({
        id: t.string,
        instanceId: t.string,
        name: t.string,
      }),
      t.partial({
        groupings: t.record(t.string, t.unknown),
      }),
    ]),
  }),
  violated: t.number,
  healthy: t.number,
  degrading: t.number,
  noData: t.number,
});

const dateRangeSchema = t.type({
  from: dateType,
  to: dateType,
});

export {
  ALL_VALUE,
  allOrAnyString,
  allOrAnyStringOrArray,
  dateRangeSchema,
  dateType,
  errorBudgetSchema,
  groupingsSchema,
  statusSchema,
  summarySchema,
  metaSchema,
  groupSummarySchema,
  remoteSchema,
};
