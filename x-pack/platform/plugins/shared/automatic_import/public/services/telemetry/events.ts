/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core-analytics-browser';

import { AutomaticImportTelemetryEventType } from '../../../common/telemetry/types';

const editFlyoutContextSchema = {
  sessionId: {
    type: 'keyword',
    _meta: {
      description: 'The ID to identify all the events in the same session',
      optional: false,
    },
  },
  integrationId: {
    type: 'keyword',
    _meta: { description: 'Integration ID', optional: true },
  },
  dataStreamId: {
    type: 'keyword',
    _meta: { description: 'Data stream ID', optional: true },
  },
} as const;

/**
 * EBT schema definitions for browser-side telemetry events.
 * These schemas define the structure of event payloads for BigQuery.

 */
export const telemetryEventsSchemas: Partial<
  Record<AutomaticImportTelemetryEventType, RootSchema<object>>
> = {
  [AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
  },

  [AutomaticImportTelemetryEventType.EditIntegrationPageLoaded]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
  },

  [AutomaticImportTelemetryEventType.DataStreamFlyoutOpened]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
  },

  [AutomaticImportTelemetryEventType.EditDataStreamFlyoutOpened]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: true },
    },
  },

  [AutomaticImportTelemetryEventType.AnalyzeLogsTriggered]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: true },
    },
    logsSource: {
      type: 'keyword',
      _meta: { description: 'Source of logs: upload or index', optional: false },
    },
    inputTypes: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: { description: 'An input type selected by the user', optional: false },
      },
      _meta: {
        description: 'Input types selected (e.g. filestream, tcp, udp)',
        optional: false,
      },
    },
  },

  [AutomaticImportTelemetryEventType.EditPipelineTabOpened]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: true },
    },
    pendingTypeChangeCount: {
      type: 'long',
      _meta: {
        description: 'Unsaved field type changes from the Table carried into the pipeline',
        optional: true,
      },
    },
  },

  // Code editor copy button clicked
  [AutomaticImportTelemetryEventType.CodeEditorCopyClicked]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: true },
    },
  },

  [AutomaticImportTelemetryEventType.ManageIntegrationsTableViewed]: {},

  [AutomaticImportTelemetryEventType.UploadIntegrationClicked]: {},

  [AutomaticImportTelemetryEventType.CancelButtonClicked]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
  },

  [AutomaticImportTelemetryEventType.DoneButtonClicked]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
  },

  [AutomaticImportTelemetryEventType.ReviewApproveMenuClicked]: {
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    version: {
      type: 'keyword',
      _meta: { description: 'Integration version at time of review', optional: true },
    },
  },
  [AutomaticImportTelemetryEventType.IntegrationDownloadZipClicked]: {
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
  },
  [AutomaticImportTelemetryEventType.ApproveModalCancelClicked]: {
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
  },
  [AutomaticImportTelemetryEventType.ApproveModalApproveClicked]: {
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    version: {
      type: 'keyword',
      _meta: { description: 'Integration version being approved', optional: true },
    },
    dataStreamCount: {
      type: 'long',
      _meta: {
        description: 'Total number of data streams in the integration at the time of approval',
        optional: false,
      },
    },
  },
  [AutomaticImportTelemetryEventType.ApproveModalApproveWithAutoInstallClicked]: {
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    version: {
      type: 'keyword',
      _meta: { description: 'Integration version being approved', optional: true },
    },
    dataStreamCount: {
      type: 'long',
      _meta: {
        description: 'Total number of data streams in the integration at the time of approval',
        optional: false,
      },
    },
  },
  [AutomaticImportTelemetryEventType.DataStreamDeleteConfirmed]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: true },
    },
  },
  [AutomaticImportTelemetryEventType.DataStreamRefreshConfirmed]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: true },
    },
  },
  [AutomaticImportTelemetryEventType.PipelineEdited]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events in the same session',
        optional: false,
      },
    },
    integrationId: {
      type: 'keyword',
      _meta: { description: 'Integration ID', optional: true },
    },
    dataStreamId: {
      type: 'keyword',
      _meta: { description: 'Data stream ID', optional: true },
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
  [AutomaticImportTelemetryEventType.FieldTypeStaged]: {
    ...editFlyoutContextSchema,
    fromType: {
      type: 'keyword',
      _meta: { description: 'Field type shown before the change', optional: false },
    },
    toType: {
      type: 'keyword',
      _meta: { description: 'Field type the user picked', optional: false },
    },
    isRevert: {
      type: 'boolean',
      _meta: {
        description: 'Whether the change returns the field to its saved type',
        optional: false,
      },
    },
  },
  [AutomaticImportTelemetryEventType.SyncToTableBlocked]: {
    ...editFlyoutContextSchema,
    reason: {
      type: 'keyword',
      _meta: {
        description:
          'Why the Table tab could not be shown: pipeline_errors, field_errors, invalid_json, or request_error',
        optional: false,
      },
    },
  },
  [AutomaticImportTelemetryEventType.PipelineCheckFailed]: {
    ...editFlyoutContextSchema,
    kind: {
      type: 'keyword',
      _meta: {
        description: 'Kind of failure: pipeline_errors, field_errors, or invalid_json',
        optional: false,
      },
    },
    failingSampleGroups: {
      type: 'long',
      _meta: {
        description: 'Number of failing sample groups (0 unless kind is pipeline_errors)',
        optional: false,
      },
    },
  },
  [AutomaticImportTelemetryEventType.BreakingChangesModalClosed]: {
    ...editFlyoutContextSchema,
    action: {
      type: 'keyword',
      _meta: { description: 'How the modal was closed: cancel or save_anyway', optional: false },
    },
    removedApprovedFieldCount: {
      type: 'long',
      _meta: {
        description: 'Fields from an approved version the pipeline no longer produces',
        optional: false,
      },
    },
  },
  [AutomaticImportTelemetryEventType.EditsDiscarded]: {
    ...editFlyoutContextSchema,
    trigger: {
      type: 'keyword',
      _meta: { description: 'What discarded the edits: reset or close', optional: false },
    },
    pendingTypeChangeCount: {
      type: 'long',
      _meta: { description: 'Unsaved field type changes that were discarded', optional: false },
    },
    pipelineDirty: {
      type: 'boolean',
      _meta: { description: 'Whether unsaved pipeline edits were discarded', optional: false },
    },
  },
};
