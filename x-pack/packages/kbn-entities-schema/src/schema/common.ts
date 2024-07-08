/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import moment from 'moment';

export const arrayOfStringsSchema = z.array(z.string());

export enum BasicAggregations {
  avg = 'avg',
  max = 'max',
  min = 'min',
  sum = 'sum',
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

export const durationSchema = z
  .string()
  .regex(/\d+[m|d|s|h]/)
  .transform((val: string) => {
    const parts = val.match(/(\d+)([m|s|h|d])/);
    if (parts === null) {
      throw new Error('Unable to parse duration');
    }
    const value = parseInt(parts[1], 10);
    const unit = parts[2] as 'm' | 's' | 'h' | 'd';
    const duration = moment.duration(value, unit);
    duration.toJSON = () => val;
    return duration;
  });

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

export const metadataSchema = z
  .object({
    source: z.string(),
    destination: z.optional(z.string()),
    limit: z.optional(z.number().default(1000)),
  })
  .or(z.string().transform((value) => ({ source: value, destination: value, limit: 1000 })));

export const identityFieldsSchema = z
  .object({
    field: z.string(),
    optional: z.boolean(),
  })
  .or(z.string().transform((value) => ({ field: value, optional: false })));
