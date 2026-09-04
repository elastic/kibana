/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LATENCY_PERCENTILES, MAX_FIELD_VALUE_LENGTH, MAX_THRESHOLD_MS } from './constants';
import type { ApmLatencyBuilderFields } from './types';

const fieldValueSchema = z.string().min(1).max(MAX_FIELD_VALUE_LENGTH);

/**
 * Validates `metadata.builder_fields` for the APM latency builder. Registration
 * rejects an unbounded schema, so every string is `max()`-bounded and the object
 * is closed.
 */
export const apmLatencyBuilderFieldsSchema: z.ZodType<ApmLatencyBuilderFields> = z
  .object({
    index: fieldValueSchema.describe('Index pattern the query reads from.'),
    timeField: fieldValueSchema.describe('Time field used for the lookback window range filter.'),
    serviceName: fieldValueSchema.describe('Service the transactions are measured for.'),
    environment: fieldValueSchema
      .optional()
      .describe('Restricts the query to a single service environment.'),
    transactionType: fieldValueSchema
      .optional()
      .describe('Restricts the query to a single transaction type, e.g. "request".'),
    percentile: z
      .literal(LATENCY_PERCENTILES)
      .describe('Latency percentile compared against the threshold.'),
    thresholdMs: z
      .number()
      .positive()
      .max(MAX_THRESHOLD_MS)
      .describe('Latency in milliseconds a group must exceed to breach.'),
    groupByTransactionName: z
      .boolean()
      .describe('Evaluates each transaction name separately instead of the service as a whole.'),
    recoveryThresholdMs: z
      .number()
      .positive()
      .max(MAX_THRESHOLD_MS)
      .optional()
      .describe('Latency in milliseconds for recovery; defaults to thresholdMs when omitted.'),
  })
  .strict()
  .describe('APM latency rule builder parameters.');
