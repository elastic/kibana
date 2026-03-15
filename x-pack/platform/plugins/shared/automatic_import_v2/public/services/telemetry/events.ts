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
 * Note: IntegrationInstalled and DataStreamCreationComplete are server-only
 * and registered in server/telemetry/events.ts
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

  [AIV2TelemetryEventType.DataStreamFlyoutOpened]: {
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
  },

  [AIV2TelemetryEventType.EditDataStreamFlyoutOpened]: {
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
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID being edited', optional: false },
    },
  },

  [AIV2TelemetryEventType.AnalyzeLogsTriggered]: {
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
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: false },
    },
  },

  // Edit pipeline tab opened
  [AIV2TelemetryEventType.EditPipelineTabOpened]: {
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
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: false },
    },
  },

  // Code editor copy button clicked
  [AIV2TelemetryEventType.CodeEditorCopyClicked]: {
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
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: false },
    },
  },
};
