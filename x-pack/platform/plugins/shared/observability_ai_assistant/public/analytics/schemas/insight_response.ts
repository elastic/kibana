/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';
import { ObservabilityAIAssistantTelemetryEventType } from '../telemetry_event_type';
import {
  type Connector,
  type Scope,
  connectorSchema,
  scopeSchema,
} from '../../../common/analytics';

export interface InsightResponse extends Connector, Scope {
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
    connector: {
      properties: connectorSchema,
    },
    scopes: scopeSchema,
  },
};
