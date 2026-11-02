/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout/src/common';

const BASE_PATH = '/api/automatic_import/integrations';
const VERSION_HEADER = { 'elastic-api-version': '1' };

export interface AutoImportApiService {
  createIntegration: (integrationId: string, title: string) => Promise<void>;
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
