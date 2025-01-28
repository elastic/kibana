/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';
import { ObservabilityAIAssistantTelemetryEventType } from '../telemetry_event_type';

export interface InsightResponse {
  '@timestamp': string;
}

export const insightResponseEventSchema: EventTypeOpts<InsightResponse> = {
  eventType: ObservabilityAIAssistantTelemetryEventType.InsightResponse,
  schema: {
    '@timestamp': {
      type: 'text',
      _meta: {
        description: 'The timestamp of the last response from the LLM.',
      },
    },
  },
};
