/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { metricTypesSchema } from '../../services/autoops_api';
import { isMetricType, METRIC_TYPE_VALUES, type MetricTypes } from '../../../common/rest_types';
import { DATA_USAGE_METRICS_API_ROUTE } from '../../../common';
import type { DataUsageContext, DataUsageRouter } from '../../types';

import { getUsageMetricsHandler } from './usage_metrics_handler';

export const registerUsageMetricsRoute = (
  router: DataUsageRouter,
  dataUsageContext: DataUsageContext
) => {
  router.versioned
    .post({
      access: 'internal',
      path: DATA_USAGE_METRICS_API_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to scoped ES client',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: UsageMetricsRequestSchema,
          },
          response: {
            200: UsageMetricsResponseSchema,
          },
        },
      },
      getUsageMetricsHandler(dataUsageContext)
    );
};

const DateSchema = schema.string({
  minLength: 1,
  validate: (v) => (v.trim().length ? undefined : 'Date ISO string must not be empty'),
});

export const UsageMetricsRequestSchema = schema.object({
  from: DateSchema,
  to: DateSchema,
  metricTypes: schema.arrayOf(schema.string(), {
    minSize: 1,
    maxSize: 1000,
    validate: (values) => {
      const trimmedValues = values.map((v) => v.trim());
      if (trimmedValues.some((v) => !v.length)) {
        return '[metricTypes] list cannot contain empty values';
      } else if (trimmedValues.some((v) => !isMetricType(v))) {
        return `must be one of ${METRIC_TYPE_VALUES.join(', ')}`;
      }
    },
  }),
  dataStreams: schema.arrayOf(schema.string(), {
    maxSize: 1000,
    validate: (values) => {
      if (values.map((v) => v.trim()).some((v) => !v.length)) {
        return 'list cannot contain empty values';
      }
    },
  }),
});

export type UsageMetricsRequestBody = TypeOf<typeof UsageMetricsRequestSchema>;

const UsageMetricsResponseSchema = {
  body: () =>
    schema.recordOf(
      metricTypesSchema,
      schema.arrayOf(
        schema.object({
          name: schema.string(),
          error: schema.nullable(schema.string()),
          data: schema.arrayOf(
            schema.object({
              x: schema.number(),
              y: schema.number(),
            }),
            { maxSize: 1000 }
          ),
        }),
        { maxSize: 1000 }
      )
    ),
};

export type MetricSeries = TypeOf<typeof UsageMetricsResponseSchema.body>[MetricTypes][number];

export type UsageMetricsResponseSchemaBody = Partial<Record<MetricTypes, MetricSeries[]>>;
