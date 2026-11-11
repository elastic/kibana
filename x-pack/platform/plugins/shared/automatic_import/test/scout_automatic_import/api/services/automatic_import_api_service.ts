/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout/src/common';

const BASE_PATH = '/api/automatic_import/integrations';
const VERSION_HEADER = { 'elastic-api-version': '1' };
const DATA_STREAM_SAVED_OBJECT_TYPE = 'data_stream-config';

export interface CompletedDataStreamParams {
  integrationId: string;
  dataStreamId: string;
  samples: string[];
  ingestPipeline: { processors: Array<Record<string, unknown>> };
  fieldMapping: Array<{ name: string; type: string; is_ecs: boolean }>;
}

export interface AutoImportApiService {
  createIntegration: (integrationId: string, title: string) => Promise<void>;
  /** Creates an integration with a data stream whose analysis already completed, without running it. */
  createCompletedDataStream: (params: CompletedDataStreamParams) => Promise<void>;
  createIntegrationWithDataStream: (
    integrationId: string,
    title: string,
    dataStreamId: string,
    dataStreamTitle: string
  ) => Promise<void>;
  deleteDataStream: (integrationId: string, dataStreamId: string) => Promise<void>;
  deleteIntegration: (integrationId: string) => Promise<void>;
  cleanupIntegrations: (integrationIds: string[]) => Promise<void>;
}

export function getAutoImportApiService(kbnClient: KbnClient): AutoImportApiService {
  return {
    async createIntegration(integrationId, title) {
      await kbnClient.request({
        method: 'PUT',
        path: BASE_PATH,
        headers: VERSION_HEADER,
        body: {
          connectorId: 'test-connector-placeholder',
          integrationId,
          title,
          description: `Scout test integration: ${integrationId}`,
        },
      });
    },

    async createCompletedDataStream({
      integrationId,
      dataStreamId,
      samples,
      ingestPipeline,
      fieldMapping,
    }) {
      await this.createIntegration(integrationId, `Scout integration ${integrationId}`);
      await kbnClient.savedObjects.create({
        type: DATA_STREAM_SAVED_OBJECT_TYPE,
        id: `${integrationId}-${dataStreamId}`,
        overwrite: true,
        attributes: {
          integration_id: integrationId,
          data_stream_id: dataStreamId,
          created_by: 'scout',
          title: `Scout data stream ${dataStreamId}`,
          description: `Scout test data stream: ${dataStreamId}`,
          input_types: ['filestream'],
          job_info: { job_id: `${dataStreamId}-job`, job_type: 'autoImport', status: 'completed' },
          metadata: { sample_count: samples.length, created_at: new Date().toISOString() },
          result: {
            ingest_pipeline: ingestPipeline,
            field_mapping: fieldMapping,
            pipeline_docs: [],
          },
        },
      });
      await kbnClient.request({
        method: 'POST',
        path: `${BASE_PATH}/${integrationId}/data_streams/${dataStreamId}/upload`,
        headers: VERSION_HEADER,
        body: { samples, originalSource: { sourceType: 'file', sourceValue: 'scout.log' } },
      });
    },

    async createIntegrationWithDataStream(integrationId, title, dataStreamId, dataStreamTitle) {
      await kbnClient.request({
        method: 'PUT',
        path: BASE_PATH,
        headers: VERSION_HEADER,
        body: {
          connectorId: 'test-connector-placeholder',
          integrationId,
          title,
          description: `Scout test integration: ${integrationId}`,
          dataStreams: [
            {
              dataStreamId,
              title: dataStreamTitle,
              description: `Scout test data stream: ${dataStreamId}`,
              inputTypes: [{ name: 'filestream' }],
            },
          ],
        },
      });
    },

    async deleteDataStream(integrationId, dataStreamId) {
      await kbnClient.request({
        method: 'DELETE',
        path: `${BASE_PATH}/${integrationId}/data_streams/${dataStreamId}`,
        headers: VERSION_HEADER,
        ignoreErrors: [404],
        retries: 0,
      });
    },

    async deleteIntegration(integrationId) {
      await kbnClient.request({
        method: 'DELETE',
        path: `${BASE_PATH}/${integrationId}`,
        headers: VERSION_HEADER,
        // Idempotent cleanup: avoid retry loop + thrown error when SO is already gone
        ignoreErrors: [404],
        retries: 0,
      });
    },

    async cleanupIntegrations(integrationIds) {
      for (const id of integrationIds) {
        await this.deleteIntegration(id);
      }
    },
  };
}
