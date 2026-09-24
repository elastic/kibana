/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { ALL_VALUE, SLO_STATUS } from '../../constants';
import { MAX_ARRAY_LENGTH, MAX_DATE_STRING_LENGTH, MAX_KEYWORD_LENGTH } from './limits';

const allOrAnyString = z.union([z.literal(ALL_VALUE), z.string().max(MAX_KEYWORD_LENGTH)]);

const allOrAnyStringOrArray = z.union([
  allOrAnyString,
  z.array(allOrAnyString).max(MAX_ARRAY_LENGTH),
]);

/**
 * Codec between a wire-form date string and a `Date` instance.
 *
 * Decoding reproduces the io-ts `dateType` semantics: any string `new Date()`
 * can parse is accepted, not only strict ISO 8601. Encoding always produces
 * the ISO string form.
 */
const dateType = z.codec(
  z
    .string()
    .max(MAX_DATE_STRING_LENGTH)
    .describe('A date string, for example 2023-01-12T10:03:19.000Z'),
  z.instanceof(Date),
  {
    decode: (value, payload) => {
      const decoded = new Date(value);
      if (isNaN(decoded.getTime())) {
        payload.issues.push({
          code: 'custom',
          message: `Invalid date: ${value}`,
          input: value,
        });
        return z.NEVER;
      }
      return decoded;
    },
    encode: (date) => date.toISOString(),
  }
);

const errorBudgetSchema = z
  .object({
    initial: z.number().describe('The initial error budget, as 1 - objective'),
    consumed: z
      .number()
      .describe('The error budget consummed, as a percentage of the initial value.'),
    remaining: z
      .number()
      .describe('The error budget remaining, as a percentage of the initial value.'),
    isEstimated: z
      .boolean()
      .describe(
        'Only for SLO defined with occurrences budgeting method and calendar aligned time window.'
      ),
  })
  .meta({ id: 'SLOErrorBudget' });

const statusSchema = z.enum(SLO_STATUS).meta({ id: 'SLOSummaryStatus' });

const summarySchema = z
  .object({
    status: statusSchema,
    sliValue: z.number(),
    errorBudget: errorBudgetSchema,
    fiveMinuteBurnRate: z.number(),
    oneHourBurnRate: z.number(),
    oneDayBurnRate: z.number(),
    summaryUpdatedAt: z.string().nullable().optional(),
  })
  .meta({ id: 'SLOSummary', description: 'The SLO computed data' });

const groupingsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const metaSchema = z.object({
  synthetics: z
    .object({
      monitorId: z.string(),
      locationId: z.string(),
      configId: z.string(),
    })
    .optional(),
});

const remoteSchema = z.object({
  remoteName: z.string(),
  kibanaUrl: z.string(),
});

const groupSummarySchema = z.object({
  total: z.number(),
  worst: z.object({
    sliValue: z.number(),
    status: z.string(),
    slo: z.object({
      id: z.string(),
      instanceId: z.string(),
      name: z.string(),
      groupings: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  violated: z.number(),
  healthy: z.number(),
  degrading: z.number(),
  noData: z.number(),
});

const dateRangeSchema = z.object({
  from: dateType,
  to: dateType,
});

export {
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
