/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaObject } from '@elastic/ebt';
import type { TrainedModelsModelTestedEbtProps } from './types';
import {
  TrainedModelsTelemetryEventTypes,
  type TrainedModelsDeploymentEbtProps,
  type TrainedModelsTelemetryEvent,
  type TrainedModelsModelDownloadEbtProps,
} from './types';

const trainedModelsDeploymentSchema: SchemaObject<TrainedModelsDeploymentEbtProps>['properties'] = {
  model_id: {
    type: 'keyword',
    _meta: {
      description: 'The ID of the trained model',
    },
  },
  optimized: {
    type: 'keyword',
    _meta: {
      description: 'The optimized setting of the deployment',
    },
  },
  adaptive_resources: {
    type: 'boolean',
    _meta: {
      description: 'Whether adaptive resources are enabled',
    },
  },
  vcpu_usage: {
    type: 'keyword',
    _meta: {
      description: 'The vCPU/VCU usage level',
    },
  },
  number_of_allocations: {
    type: 'integer',
    _meta: {
      description: 'The number of allocations',
      optional: true,
    },
  },
  threads_per_allocation: {
    type: 'integer',
    _meta: {
      description: 'The number of threads per allocation',
    },
  },
  min_number_of_allocations: {
    type: 'integer',
    _meta: {
      description: 'The minimum number of allocations',
      optional: true,
    },
  },
  max_number_of_allocations: {
    type: 'integer',
    _meta: {
      description: 'The maximum number of allocations',
      optional: true,
    },
  },
  result: {
    type: 'keyword',
    _meta: {
      description: 'The result of the deployment',
    },
  },
};

const trainedModelsModelDownloadSchema: SchemaObject<TrainedModelsModelDownloadEbtProps>['properties'] =
  {
    model_id: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the trained model',
      },
    },
    result: {
      type: 'keyword',
      _meta: {
        description: 'The result of the model download',
      },
    },
  };

const trainedModelsModelTestedSchema: SchemaObject<TrainedModelsModelTestedEbtProps>['properties'] =
  {
    model_id: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the trained model',
      },
    },
    model_type: {
      type: 'keyword',
      _meta: {
        description: 'The type of the trained model',
        optional: true,
      },
    },
    task_type: {
      type: 'keyword',
      _meta: {
        description: 'The type of the task',
        optional: true,
      },
    },
    result: {
      type: 'keyword',
      _meta: {
        description: 'The result of the task',
      },
    },
  };

const trainedModelsDeploymentCreatedEventType: TrainedModelsTelemetryEvent = {
  eventType: TrainedModelsTelemetryEventTypes.DEPLOYMENT_CREATED,
  schema: trainedModelsDeploymentSchema,
};

const trainedModelsModelDownloadEventType: TrainedModelsTelemetryEvent = {
  eventType: TrainedModelsTelemetryEventTypes.MODEL_DOWNLOAD,
  schema: trainedModelsModelDownloadSchema,
};

const trainedModelsDeploymentUpdatedEventType: TrainedModelsTelemetryEvent = {
  eventType: TrainedModelsTelemetryEventTypes.DEPLOYMENT_UPDATED,
  schema: trainedModelsDeploymentSchema,
};

const trainedModelsModelTestedEventType: TrainedModelsTelemetryEvent = {
  eventType: TrainedModelsTelemetryEventTypes.MODEL_TESTED,
  schema: trainedModelsModelTestedSchema,
};

export const trainedModelsEbtEvents = {
  trainedModelsDeploymentCreatedEventType,
  trainedModelsModelDownloadEventType,
  trainedModelsDeploymentUpdatedEventType,
  trainedModelsModelTestedEventType,
};
