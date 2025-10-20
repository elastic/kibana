import { SavedObject } from "@kbn/core/server";
import { DATA_STREAM_SAVED_OBJECT_TYPE, DataStreamAttributes, INTEGRATION_SAVED_OBJECT_TYPE, IntegrationAttributes } from "../saved_objects";

export const mockIntegrationData: IntegrationAttributes = {
  integration_id: 'test-integration-id',
  data_stream_count: 2,
  status: 'active',
  metadata: {
    title: 'Test Integration',
    description: 'A test integration',
    created_at: '2024-01-01T00:00:00.000Z',
    version: 1,
  },
};

export const mockDataStreamData: DataStreamAttributes = {
  integration_id: 'test-integration-id',
  data_stream_id: 'test-data-stream-id',
  job_info: {
    job_id: 'test-job-id',
    job_type: 'test-job-type',
    status: 'pending',
  },
  metadata: {
    sample_count: 100,
    version: 1,
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
