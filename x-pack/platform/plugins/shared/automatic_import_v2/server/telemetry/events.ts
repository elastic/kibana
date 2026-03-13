/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

import { AIV2TelemetryEventType } from '../../common';

/**
 * Server-side EBT event schemas.
 * These are used by server/plugin.ts to register event types.
 */
export const telemetryEventsSchemas: Record<AIV2TelemetryEventType, EventTypeOpts<object>> = {
  [AIV2TelemetryEventType.IntegrationInstalled]: {
    eventType: AIV2TelemetryEventType.IntegrationInstalled,
    schema: {
      sessionId: {
        type: 'keyword',
        _meta: { description: 'Session identifier', optional: false },
      },
      integrationName: {
        type: 'keyword',
        _meta: { description: 'Integration name', optional: false },
      },
      version: {
        type: 'keyword',
        _meta: { description: 'Integration version', optional: false },
      },
      dataStreamCount: {
        type: 'long',
        _meta: { description: 'Number of data streams', optional: false },
      },
      dataStreamNames: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: { description: 'Data stream name', optional: false },
        },
        _meta: { description: 'List of data stream names', optional: false },
      },
      processorCount: {
        type: 'long',
        _meta: { description: 'Total number of processors across all pipelines', optional: false },
      },
      processorTypes: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: { description: 'Processor type', optional: false },
        },
        _meta: { description: 'List of unique processor types used', optional: false },
      },
    },
  },
};
