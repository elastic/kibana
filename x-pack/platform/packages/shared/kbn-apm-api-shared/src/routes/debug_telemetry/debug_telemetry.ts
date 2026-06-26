/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APMTelemetry } from '@kbn/apm-types';
import { defineRoute } from '../types';

export type DebugTelemetryResponse = APMTelemetry;

export const debugTelemetryRoute = defineRoute<DebugTelemetryResponse>()({
  endpoint: 'GET /internal/apm/debug-telemetry',
});
