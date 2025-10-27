/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type {
  DataStreamAttributes,
  IntegrationAttributes,
} from '../services/saved_objects/schemas/types';
import {
  DATA_STREAM_SAVED_OBJECT_TYPE,
  INTEGRATION_SAVED_OBJECT_TYPE,
  TASK_STATUSES,
} from '../services/saved_objects/constants';

export const mockIntegrationData: IntegrationAttributes = {
  integration_id: 'test-integration-id',
  data_stream_count: 2,
  created_by: 'test-user',
  status: TASK_STATUSES.pending,
  metadata: {
    title: 'Test Integration',
    description: 'A test integration',
    created_at: '2024-01-01T00:00:00.000Z',
    version: '0.0.0',
  },
};

export const mockDataStreamData: DataStreamAttributes = {
  integration_id: 'test-integration-id',
  data_stream_id: 'test-data-stream-id',
  created_by: 'test-user',
  job_info: {
    job_id: 'test-job-id',
    job_type: 'test-job-type',
    status: TASK_STATUSES.pending,
  },
  metadata: {
    sample_count: 100,
    version: '0.0.0',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  result: {
    ingest_pipeline: 'test-pipeline',
    field_mapping: {
      'test-field': 'test-value',
    },
  },
};

export const mockSavedObject: SavedObject<IntegrationAttributes> = {
  id: 'test-integration-id',
  type: INTEGRATION_SAVED_OBJECT_TYPE,
  attributes: mockIntegrationData,
  references: [],
  version: '1',
};

export const mockDataStreamSavedObject: SavedObject<DataStreamAttributes> = {
  id: 'test-data-stream-id',
  type: DATA_STREAM_SAVED_OBJECT_TYPE,
  attributes: mockDataStreamData,
  references: [],
  version: '1',
};
