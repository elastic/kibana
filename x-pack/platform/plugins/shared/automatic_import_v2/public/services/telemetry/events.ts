/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core-analytics-browser';

import { AIV2TelemetryEventType } from '../../../common';

/**
 * EBT schema definitions for browser-side telemetry events.
 * These schemas define the structure of event payloads for BigQuery.
 *
 * Note: IntegrationInstalled is server-only and registered in server/telemetry/events.ts
 */
export const telemetryEventsSchemas: Partial<Record<AIV2TelemetryEventType, RootSchema<object>>> = {
  [AIV2TelemetryEventType.CreateIntegrationPageLoaded]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
  },
};
