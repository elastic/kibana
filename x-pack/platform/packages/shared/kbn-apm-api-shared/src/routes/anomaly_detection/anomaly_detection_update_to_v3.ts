/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';

export interface AnomalyDetectionUpdateToV3Response {
  update: boolean;
}

export const anomalyDetectionUpdateToV3Route = defineRoute<AnomalyDetectionUpdateToV3Response>()({
  endpoint: 'POST /internal/apm/settings/anomaly-detection/update_to_v3',
});
