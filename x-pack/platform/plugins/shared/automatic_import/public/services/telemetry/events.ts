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
  [TelemetryEventType.UploadIntegrationZipComplete]: {
    integrationName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the integration in the zip file that was uploaded',
        optional: true,
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

  [TelemetryEventType.AutomaticImportOpen]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
  },

  [TelemetryEventType.AutomaticImportStepComplete]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
    step: {
      type: 'long',
      _meta: {
        description: 'The step number',
        optional: false,
      },
    },
    stepName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the step',
        optional: false,
      },
    },
    durationMs: {
      type: 'long',
      _meta: {
        description: 'Time spent in the current step',
        optional: false,
      },
    },
    sessionElapsedTime: {
      type: 'long',
      _meta: {
        description: 'Total time spent in the current generation session',
        optional: false,
      },
    },
  },

  [TelemetryEventType.AutomaticImportGenerationComplete]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
    sampleRows: {
      type: 'long',
      _meta: {
        description: 'The number of log rows provided as sample data',
        optional: false,
      },
    },
    durationMs: {
      type: 'long',
      _meta: {
        description: 'Time spent in the generation process',
        optional: false,
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'The connector action type ID',
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
        description: 'The error message if the generation failed',
        optional: true,
      },
    },
  },

  [TelemetryEventType.AutomaticImportCelGenerationComplete]: {
    sessionId: {
      type: 'keyword',
      _meta: {
        description: 'The ID to identify all the events the same session',
        optional: false,
      },
    },
    durationMs: {
      type: 'long',
      _meta: {
        description: 'Time spent in the generation process',
        optional: false,
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'The connector action type ID',
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
        description: 'The error message if the generation failed',
        optional: true,
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
    durationMs: {
      type: 'long',
      _meta: {
        description: 'Total time spent in the workflow',
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
    dataStreamName: {
      type: 'keyword',
      _meta: {
        description: 'The name of the data stream used for the integration',
        optional: false,
      },
    },
    inputTypes: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The input type used for the integration',
          optional: false,
        },
      },
    },
    actionTypeId: {
      type: 'keyword',
      _meta: {
        description: 'The connector action type ID',
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
        description: 'The error message if the workflow failed',
        optional: true,
      },
    },
  },
};
