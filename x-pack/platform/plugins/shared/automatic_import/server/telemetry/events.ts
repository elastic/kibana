/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

import { AutomaticImportTelemetryEventType } from '../../common';

/**
 * Server-side EBT event schemas.
 * These are used by server/plugin.ts to register event types.
 */
export const telemetryEventsSchemas: Partial<
  Record<AutomaticImportTelemetryEventType, EventTypeOpts<object>>
> = {
  // F4: Datastream creation completion (from Task Manager)
  [AutomaticImportTelemetryEventType.DataStreamCreationComplete]: {
    eventType: AutomaticImportTelemetryEventType.DataStreamCreationComplete,
    schema: {
      sessionId: {
        type: 'keyword',
        _meta: {
          description: 'The ID to identify all the events in the same session',
          optional: false,
        },
      },
      integrationId: {
        type: 'keyword',
        _meta: { description: 'Integration ID', optional: false },
      },
      integrationName: {
        type: 'keyword',
        _meta: { description: 'Integration name', optional: false },
      },
      dataStreamId: {
        type: 'keyword',
        _meta: { description: 'Data stream ID', optional: false },
      },
      dataStreamName: {
        type: 'keyword',
        _meta: { description: 'Data stream name', optional: false },
      },
      durationMs: {
        type: 'long',
        _meta: {
          description: 'Time taken for datastream creation in milliseconds',
          optional: false,
        },
      },
      success: {
        type: 'boolean',
        _meta: { description: 'Whether the creation was successful', optional: false },
      },
      errorMessage: {
        type: 'keyword',
        _meta: { description: 'Error message if creation failed', optional: true },
      },
    },
  },

  // Integration installed event
  [AutomaticImportTelemetryEventType.IntegrationInstalled]: {
    eventType: AutomaticImportTelemetryEventType.IntegrationInstalled,
    schema: {
      sessionId: {
        type: 'keyword',
        _meta: {
          description: 'The ID to identify all the events in the same session',
          optional: false,
        },
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
        _meta: { description: 'Total number of data streams in the integration', optional: false },
      },
      dataStreamName: {
        type: 'keyword',
        _meta: { description: 'Data stream name (dataset) for this event', optional: false },
      },
    },
  },
};
