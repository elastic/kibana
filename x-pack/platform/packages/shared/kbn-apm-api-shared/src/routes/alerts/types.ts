/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { AggregationType, type Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { rangeSchema } from '../../default_api_types';
import {
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
  MAX_KUERY_LENGTH,
} from '../../constants';

const MAX_GROUP_BY_FIELDS = 10; // same as the APM rule params
const MAX_QUERY_LANGUAGE_LENGTH = 64;
const MAX_SEARCH_CONFIGURATION_LENGTH = 100_000; // serialized search configuration (JSON string)

const searchConfigurationSchema = z.object({
  query: z.object({
    query: z.union([
      z.string().max(MAX_KUERY_LENGTH),
      z.record(z.string().max(MAX_FIELD_VALUE_LENGTH), z.any()),
    ]),
    language: z.string().max(MAX_QUERY_LANGUAGE_LENGTH),
  }),
});

// Equivalent of io-ts's jsonRt.pipe(searchConfigurationRt): parse a JSON
// string, then validate the parsed value against searchConfigurationSchema.
const searchConfigurationJsonSchema = z
  .string()
  .max(MAX_SEARCH_CONFIGURATION_LENGTH)
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(searchConfigurationSchema);

export const alertParamsSchema = z
  .object({
    aggregationType: z
      .union([
        z.literal(AggregationType.Avg),
        z.literal(AggregationType.P95),
        z.literal(AggregationType.P99),
      ])
      .optional(),
    serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
    errorGroupingKey: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
    transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
    transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH).optional(),
    interval: z.string().max(MAX_FIELD_VALUE_LENGTH),
    groupBy: z.array(z.string().max(MAX_FIELD_VALUE_LENGTH)).max(MAX_GROUP_BY_FIELDS).optional(),
    searchConfiguration: searchConfigurationJsonSchema.optional(),
  })
  .merge(environmentSchema)
  .merge(rangeSchema);

export type AlertParams = z.infer<typeof alertParamsSchema>;

export interface PreviewChartResponseItem {
  name: string;
  data: Coordinate[];
}

export interface PreviewChartResponse {
  series: PreviewChartResponseItem[];
  totalGroups: number;
}
