/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';

export const anomalyThresholdSchema = z.union([
  z.literal(ML_ANOMALY_SEVERITY.CRITICAL),
  z.literal(ML_ANOMALY_SEVERITY.MAJOR),
  z.literal(ML_ANOMALY_SEVERITY.MINOR),
  z.literal(ML_ANOMALY_SEVERITY.WARNING),
  z.literal(ML_ANOMALY_SEVERITY.LOW),
  z.literal('none'),
]);

export type AnomalyThreshold = z.infer<typeof anomalyThresholdSchema>;
