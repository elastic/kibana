/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

import { AutomaticImportTelemetryEventType } from '../../common';

export const MAX_TELEMETRY_TYPE_CHANGES = 50;
export const MAX_TELEMETRY_FIELD_ERROR_ISSUES = 20;

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
      connectorId: {
        type: 'keyword',
        _meta: { description: 'Inference connector ID used for AI generation', optional: false },
      },
      modelName: {
        type: 'keyword',
        _meta: {
          description: 'Model name from connector config (undefined when config is not exposed)',
          optional: true,
        },
      },
      connectorType: {
        type: 'keyword',
        _meta: { description: 'Inference connector type (e.g. .bedrock, .gen-ai)', optional: true },
      },
      connectorName: {
        type: 'keyword',
        _meta: { description: 'Inference connector display name', optional: true },
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

  // A save (not a preview) of field type and pipeline edits that got a response or a version conflict
  [AutomaticImportTelemetryEventType.DataStreamEditsSubmitted]: {
    eventType: AutomaticImportTelemetryEventType.DataStreamEditsSubmitted,
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
      dataStreamId: {
        type: 'keyword',
        _meta: { description: 'Data stream ID', optional: false },
      },
      outcome: {
        type: 'keyword',
        _meta: {
          description:
            'saved, field_errors, pipeline_errors, breaking_changes_unacknowledged, or conflict',
          optional: false,
        },
      },
      dataStreamApproved: {
        type: 'boolean',
        _meta: {
          description: 'Whether the data stream is in the last approved version',
          optional: false,
        },
      },
      pipelineChanged: {
        type: 'boolean',
        _meta: {
          description:
            'Whether the pipeline differs from the saved one, ignoring generated field type processors',
          optional: false,
        },
      },
      fieldTypeChangeCount: {
        type: 'long',
        _meta: { description: 'Number of field type changes in the save', optional: false },
      },
      typeChanges: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: { description: 'A field type change as from:to, e.g. long:keyword' },
        },
        _meta: {
          description: `Field type changes as from:to pairs, without field names (at most ${MAX_TELEMETRY_TYPE_CHANGES})`,
          optional: false,
        },
      },
      fieldTypeOverrideCount: {
        type: 'long',
        _meta: {
          description: 'Field type edits on the data stream after the save',
          optional: false,
        },
      },
      removedApprovedFieldCount: {
        type: 'long',
        _meta: {
          description: 'Fields from an approved version the pipeline no longer produces',
          optional: false,
        },
      },
      breakingChangesAcknowledged: {
        type: 'boolean',
        _meta: { description: 'Whether the user chose Save anyway', optional: false },
      },
      approvalReset: {
        type: 'boolean',
        _meta: {
          description: 'Whether the save sent an approved integration back for approval',
          optional: false,
        },
      },
      fieldErrorIssues: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: { description: 'A field error issue code, e.g. not_numeric' },
        },
        _meta: {
          description: `Distinct field error issue codes (at most ${MAX_TELEMETRY_FIELD_ERROR_ISSUES})`,
          optional: false,
        },
      },
    },
  },
};
