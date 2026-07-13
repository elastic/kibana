/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';

export const anomalyThresholdRt = t.union([
  t.literal(ML_ANOMALY_SEVERITY.CRITICAL),
  t.literal(ML_ANOMALY_SEVERITY.MAJOR),
  t.literal(ML_ANOMALY_SEVERITY.MINOR),
  t.literal(ML_ANOMALY_SEVERITY.WARNING),
  t.literal(ML_ANOMALY_SEVERITY.LOW),
  t.literal('none'),
]);

export type AnomalyThreshold = t.TypeOf<typeof anomalyThresholdRt>;

/**
 * zod equivalent, additive (see `default_api_types.ts` in `@kbn/apm-api-shared`
 * for why - elastic/kibana#243355).
 */
export const anomalyThresholdSchema = z.union([
  z.literal(ML_ANOMALY_SEVERITY.CRITICAL),
  z.literal(ML_ANOMALY_SEVERITY.MAJOR),
  z.literal(ML_ANOMALY_SEVERITY.MINOR),
  z.literal(ML_ANOMALY_SEVERITY.WARNING),
  z.literal(ML_ANOMALY_SEVERITY.LOW),
  z.literal('none'),
]);
