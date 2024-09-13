/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import moment from 'moment';

export const arrayOfStringsSchema = z.array(z.string());

export enum BasicAggregations {
  avg = 'avg',
  max = 'max',
  min = 'min',
  sum = 'sum',
  value_count = 'value_count',
  cardinality = 'cardinality',
  last_value = 'last_value',
  std_deviation = 'std_deviation',
}

export const basicAggregationsSchema = z.nativeEnum(BasicAggregations);

const metricNameSchema = z
  .string()
  .length(1)
  .regex(/[a-zA-Z]/)
  .toUpperCase();

export const filterSchema = z.optional(z.string());

export const basicMetricWithFieldSchema = z.object({
  name: metricNameSchema,
  aggregation: basicAggregationsSchema,
  field: z.string(),
  filter: filterSchema,
});

export const docCountMetricSchema = z.object({
  name: metricNameSchema,
  aggregation: z.literal('doc_count'),
  filter: filterSchema,
});

export const durationSchema = z.string().regex(/^\d+[m|d|s|h]$/);

export const durationSchemaWithMinimum = (minimumMinutes: number) =>
  durationSchema.refine(
    (val: string) => {
      const parts = val.match(/(\d+)([m|s|h|d])/);
      if (parts === null) {
        throw new Error('Unable to parse duration');
      }
      const value = parseInt(parts[1], 10);
      const unit = parts[2] as 'm' | 's' | 'h' | 'd';
      return moment.duration(value, unit).asMinutes() >= minimumMinutes;
    },
    { message: `can not be less than ${minimumMinutes}m` }
  );

export const percentileMetricSchema = z.object({
  name: metricNameSchema,
  aggregation: z.literal('percentile'),
  field: z.string(),
  percentile: z.number(),
  filter: filterSchema,
});

export const metricSchema = z.discriminatedUnion('aggregation', [
  basicMetricWithFieldSchema,
  docCountMetricSchema,
  percentileMetricSchema,
]);

export type Metric = z.infer<typeof metricSchema>;

export const keyMetricSchema = z.object({
  name: z.string(),
  metrics: z.array(metricSchema),
  equation: z.string(),
});

export type KeyMetric = z.infer<typeof keyMetricSchema>;

export const metadataAggregation = z.union([
  z.object({ type: z.literal('terms'), limit: z.number().default(1000) }),
  z.object({
    type: z.literal('top_value'),
    sort: z.record(z.string(), z.union([z.literal('asc'), z.literal('desc')])),
    lookbackPeriod: durationSchema,
  }),
]);

export const metadataSchema = z
  .object({
    source: z.string(),
    destination: z.optional(z.string()),
    aggregation: z
      .optional(metadataAggregation)
      .default({ type: z.literal('terms').value, limit: 1000 }),
  })
  .or(
    z.string().transform((value) => ({
      source: value,
      destination: value,
      aggregation: { type: z.literal('terms').value, limit: 1000 },
    }))
  )
  .transform((metadata) => ({
    ...metadata,
    destination: metadata.destination ?? metadata.source,
  }))
  .superRefine((value, ctx) => {
    if (value.aggregation.type === 'terms' && value.aggregation.limit < 1) {
      ctx.addIssue({
        path: ['limit'],
        code: z.ZodIssueCode.custom,
        message: 'limit for terms aggregation should be greater than 1',
      });
    }
    if (value.source.length === 0) {
      ctx.addIssue({
        path: ['source'],
        code: z.ZodIssueCode.custom,
        message: 'source should not be empty',
      });
    }
    if (value.destination.length === 0) {
      ctx.addIssue({
        path: ['destination'],
        code: z.ZodIssueCode.custom,
        message: 'destination should not be empty',
      });
    }
  });

export type MetadataField = z.infer<typeof metadataSchema>;

export const identityFieldsSchema = z
  .object({
    field: z.string(),
    optional: z.boolean(),
  })
  .or(z.string().transform((value) => ({ field: value, optional: false })));

const semVerRegex = new RegExp(/^[0-9]{1,}\.[0-9]{1,}\.[0-9]{1,}$/);
export const semVerSchema = z.string().refine((maybeSemVer) => semVerRegex.test(maybeSemVer), {
  message:
    'The string does use the Semantic Versioning (Semver) format of {major}.{minor}.{patch} (e.g., 1.0.0), ensure each part contains only digits.',
});

export const historySettingsSchema = z
  .optional(
    z.object({
      syncField: z.optional(z.string()),
      syncDelay: z.optional(durationSchema),
      lookbackPeriod: z.optional(durationSchema).default('1h'),
      frequency: z.optional(durationSchema),
      backfillSyncDelay: z.optional(durationSchema),
      backfillLookbackPeriod: z.optional(durationSchema),
      backfillFrequency: z.optional(durationSchema),
    })
  )
  .transform((settings) => {
    return {
      ...settings,
      lookbackPeriod: settings?.lookbackPeriod || durationSchema.parse('1h'),
    };
  });
