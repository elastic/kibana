/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core-analytics-browser';
import { TelemetryEventType, type TelemetryEventTypeData } from './types';

type TelemetryEventsSchemas = {
  [T in TelemetryEventType]: RootSchema<TelemetryEventTypeData<T>>;
};

/**
 * telemetryEventsSchemas
 * Defines the schema for each of the event types
 * */
export const telemetryEventsSchemas: TelemetryEventsSchemas = {
  [TelemetryEventType.IntegrationManagementOpen]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
  },
  [TelemetryEventType.CreateManageDataStreamFlyoutOpen]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
    datastreamName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the data stream',
        optional: false,
      },
    },
  },
  [TelemetryEventType.UploadDatastreamLogsZipCompleteData]: {
    datastreamName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the data stream',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'The error message if the upload failed',
        optional: true,
      },
    },
  },
  [TelemetryEventType.ViewResultsFlyoutOpen]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
    datastreamName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the data stream',
        optional: false,
      },
    },
    sampleRows: {
      type: 'long',
      _meta: {
        description: 'The number of sample rows',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'The error message if the upload failed',
        optional: true,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The model used to generate the integration',
        optional: false,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'The provider of the LLM',
        optional: false,
      },
    },
  },
  [TelemetryEventType.AutomaticImportComplete]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
    integrationName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the integration',
        optional: false,
      },
    },
    integrationDescription: {
      type: 'keyword',
      _meta: {
        description: 'The description of the integration',
        optional: false,
      },
    },
    dataStreamNames: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The name of the data stream',
          optional: false,
        },
      },
    },
    inputTypes: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The input type',
          optional: false,
        },
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'The action type ID',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The model used to generate the integration',
        optional: false,
      },
    },
    provider: {
      type: 'keyword',
      _meta: {
        description: 'The provider of the LLM',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'The error message if the upload failed',
        optional: true,
      },
    },
  },
};
