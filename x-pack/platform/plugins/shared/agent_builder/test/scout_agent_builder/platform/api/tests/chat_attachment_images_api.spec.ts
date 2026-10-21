/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHAT_ATTACHMENT_IMAGES_FILE_KIND } from '@kbn/agent-builder-common/attachments';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { agentBuilderRole } from '../../../../scout_agent_builder_shared/lib/roles';
import { apiTest, COMMON_HEADERS } from '../fixtures';

const FILES_API_BASE = `/api/files/files/${CHAT_ATTACHMENT_IMAGES_FILE_KIND}`;
const FILE_NAME = 'pixel.png';
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

apiTest.describe(
  'Agent Builder — chat attachment images file kind',
  { tag: [...tags.stateful.classic] },
  () => {
    let readerHeaders: Record<string, string>;
    let noAgentBuilderHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const reader = await requestAuth.getApiKeyForCustomRole(
        agentBuilderRole('*', ['minimal_read'])
      );
      readerHeaders = { ...COMMON_HEADERS, ...reader.apiKeyHeader };

      const noAgentBuilder = await requestAuth.getApiKeyForCustomRole({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
      });
      noAgentBuilderHeaders = { ...COMMON_HEADERS, ...noAgentBuilder.apiKeyHeader };
    });

    apiTest(
      'a user with Agent Builder read access can create, upload, download and delete an image',
      async ({ apiClient }) => {
        const createRes = await apiClient.post(FILES_API_BASE, {
          headers: readerHeaders,
          body: { name: 'pixel', mimeType: 'image/png' },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const fileId = createRes.body.file.id as string;

        const uploadRes = await apiClient.put(`${FILES_API_BASE}/${fileId}/blob`, {
          headers: { ...readerHeaders, 'Content-Type': 'image/png' },
          body: PNG_BYTES,
          responseType: 'json',
        });
        expect(uploadRes).toHaveStatusCode(200);

        const downloadRes = await apiClient.get(`${FILES_API_BASE}/${fileId}/blob/${FILE_NAME}`, {
          headers: readerHeaders,
          responseType: 'buffer',
        });
        expect(downloadRes).toHaveStatusCode(200);
        expect(Buffer.compare(downloadRes.body as Buffer, PNG_BYTES)).toBe(0);

        const deleteRes = await apiClient.delete(`${FILES_API_BASE}/${fileId}`, {
          headers: readerHeaders,
          responseType: 'json',
        });
        expect(deleteRes).toHaveStatusCode(200);
      }
    );

    apiTest('a user without Agent Builder access cannot create an image', async ({ apiClient }) => {
      const createRes = await apiClient.post(FILES_API_BASE, {
        headers: noAgentBuilderHeaders,
        body: { name: 'pixel', mimeType: 'image/png' },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(403);
    });
  }
);
