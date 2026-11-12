/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ISO_DATE_MAX_LENGTH,
  MAX_EXECUTION_FILTER_LENGTH,
  MAX_ID_LENGTH,
  MAX_NAMESPACES,
} from '../../../../../constants';

export const getGlobalExecutionTrendsQuerySchema = schema.object({
  date_start: schema.string({ maxLength: ISO_DATE_MAX_LENGTH }),
  date_end: schema.maybe(schema.string({ maxLength: ISO_DATE_MAX_LENGTH })),
  filter: schema.maybe(schema.string({ maxLength: MAX_EXECUTION_FILTER_LENGTH })),
  namespaces: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: MAX_ID_LENGTH }), { maxSize: MAX_NAMESPACES })
  ),
});

const positiveNumber = schema.number({ min: 0 });

export const getGlobalExecutionTrendsResponseBodySchema = schema.object(
  {
    interval: schema.string(),
    buckets: schema.arrayOf(
      schema.object({
        timestamp: schema.string(),
        total: positiveNumber,
        success: positiveNumber,
        failure: positiveNumber,
        warning: positiveNumber,
        unknown: positiveNumber,
        avg_duration_ms: positiveNumber,
      })
    ),
    top_failing_rules: schema.arrayOf(
      schema.object({
        id: schema.string(),
        name: schema.string(),
        failures: positiveNumber,
        last_failure: schema.nullable(schema.string()),
      })
    ),
    slowest_rules: schema.arrayOf(
      schema.object({
        id: schema.string(),
        name: schema.string(),
        executions: positiveNumber,
        avg_duration_ms: positiveNumber,
      })
    ),
  },
  { meta: { id: 'global_execution_trends_response' } }
);
