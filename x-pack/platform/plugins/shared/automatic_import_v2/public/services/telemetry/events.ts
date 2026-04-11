/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core-analytics-browser';

import { AIV2TelemetryEventType } from '../../../common/telemetry/types';

/**
 * EBT schema definitions for browser-side telemetry events.
 * These schemas define the structure of event payloads for BigQuery.

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
    isFirstDataStream: {
      type: 'boolean',
      _meta: {
        description: 'True if this is the first data stream being created for a new integration',
        optional: false,
      },
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
  },

  [AIV2TelemetryEventType.AnalyzeLogsTriggered]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    logsSource: {
      type: 'keyword',
      _meta: { description: 'Source of logs: upload or index', optional: false },
    },
  },

  [AIV2TelemetryEventType.EditPipelineTabOpened]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
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
  },

  [AIV2TelemetryEventType.ManageIntegrationsTableViewed]: {},

  [AIV2TelemetryEventType.UploadIntegrationClicked]: {},

  [AIV2TelemetryEventType.CancelButtonClicked]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
  },

  [AIV2TelemetryEventType.DoneButtonClicked]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
  },

  [AIV2TelemetryEventType.ReviewApproveMenuClicked]: {},
  [AIV2TelemetryEventType.IntegrationDownloadZipClicked]: {},
  [AIV2TelemetryEventType.ApproveModalCancelClicked]: {},
  [AIV2TelemetryEventType.ApproveModalApproveClicked]: {},
  [AIV2TelemetryEventType.IntegrationDeleteConfirmed]: {},
  [AIV2TelemetryEventType.DataStreamDeleteConfirmed]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
  },
  [AIV2TelemetryEventType.DataStreamRefreshConfirmed]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
  },
  [AIV2TelemetryEventType.PipelineEdited]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    linesAdded: {
      type: 'long',
      _meta: {
        description: 'Number of lines added to the pipeline',
        optional: false,
      },
    },
    linesRemoved: {
      type: 'long',
      _meta: {
        description: 'Number of lines removed from the pipeline',
        optional: false,
      },
    },
    netLineChange: {
      type: 'long',
      _meta: {
        description: 'Net change in line count (added - removed)',
        optional: false,
      },
    },
  },
};
