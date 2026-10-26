/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData, registerAiIndex, withQuery, createKiDest, storedKi } from '../fixtures';

const {
  AI_INDEX_COLLECTION_PATH,
  API_HEADERS,
  CONTEXT_ENGINE_ALL,
  INTERNAL_API_HEADERS,
  kiByIdPath,
  kiListPath,
  kiRestorePath,
} = testData;

const RUN_ID = randomUUID().slice(0, 8);
const AI_INDEX_ID = `scout_ki_write_${RUN_ID}`;
const DEST_INDEX = `ai-index-idx-scout-ki-write-${RUN_ID}`;
const DS_AI_INDEX_ID = `scout_ki_write_ds_${RUN_ID}`;
const DS_DEST = `ai-index-ds-scout-ki-write-${RUN_ID}`;
const KI_ID = 'scout-ki-write-target';
const DS_KI_ID = 'scout-ki-write-ds-target';

/** Documented caller: Context Engine write access plus ES write privileges on the backing indices. */
const KI_WRITE_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      { names: [DEST_INDEX, DS_DEST], privileges: ['read', 'write', 'view_index_metadata'] },
    ],
  },
  kibana: [CONTEXT_ENGINE_ALL],
};

apiTest.describe('context engine KI write API', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let viewerApiCredentials: RoleApiCredentials;
  let writerApiCredentials: RoleApiCredentials;
  let adminInternalHeaders: Record<string, string>;
  let viewerInternalHeaders: Record<string, string>;
  let writerInternalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, esClient, apiClient }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    viewerApiCredentials = await requestAuth.getApiKey('viewer');
    writerApiCredentials = await requestAuth.getApiKeyForCustomRole(KI_WRITE_ROLE);
    adminInternalHeaders = { ...INTERNAL_API_HEADERS, ...adminApiCredentials.apiKeyHeader };
    viewerInternalHeaders = { ...INTERNAL_API_HEADERS, ...viewerApiCredentials.apiKeyHeader };
    writerInternalHeaders = { ...INTERNAL_API_HEADERS, ...writerApiCredentials.apiKeyHeader };

    await createKiDest(esClient, { type: 'index', value: DEST_INDEX });
    await createKiDest(esClient, { type: 'data_stream', value: DS_DEST });

    const { errors } = await esClient.bulk({
      refresh: true,
      operations: [
        { index: { _index: DEST_INDEX, _id: KI_ID } },
        storedKi({ id: KI_ID, content: 'Original content' }),
        { create: { _index: DS_DEST } },
        storedKi({ id: DS_KI_ID, content: 'Data stream original' }),
      ],
    });
    expect(errors).toBe(false);

    for (const body of [
      registerAiIndex(AI_INDEX_ID, { type: 'index', value: DEST_INDEX }),
      registerAiIndex(DS_AI_INDEX_ID, { type: 'data_stream', value: DS_DEST }),
    ]) {
      const response = await apiClient.post(AI_INDEX_COLLECTION_PATH, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body,
      });
      expect(response).toHaveStatusCode(201);
    }
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    for (const id of [AI_INDEX_ID, DS_AI_INDEX_ID]) {
      await apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${id}`, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
    }
    await esClient.indices.delete({ index: DEST_INDEX }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: DS_DEST }, { ignore: [404] });
  });

  apiTest('updates, soft-deletes, and restores a KI on an index dest', async ({ apiClient }) => {
    const kiPath = kiByIdPath(AI_INDEX_ID, KI_ID);

    await apiTest.step('updates the KI content', async () => {
      const patchResponse = await apiClient.patch(kiPath, {
        headers: writerInternalHeaders,
        responseType: 'json',
        body: { ki: { content: 'Updated by scout' } },
      });
      expect(patchResponse).toHaveStatusCode(200);
      expect(patchResponse.body).toStrictEqual({ id: KI_ID, status: 'updated' });

      const getActive = await apiClient.get(withQuery(kiPath, { index: DEST_INDEX }), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(getActive).toHaveStatusCode(200);
      expect(getActive.body.document).toMatchObject({ content: 'Updated by scout' });
    });

    await apiTest.step('soft-deletes the KI', async () => {
      const deleteResponse = await apiClient.delete(kiPath, {
        headers: writerInternalHeaders,
        responseType: 'json',
      });
      expect(deleteResponse).toHaveStatusCode(200);
      expect(deleteResponse.body).toStrictEqual({ id: KI_ID });

      const getMissing = await apiClient.get(withQuery(kiPath, { index: DEST_INDEX }), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(getMissing).toHaveStatusCode(404);

      const getDeleted = await apiClient.get(
        withQuery(kiPath, { index: DEST_INDEX, lifecycle_status: 'deleted' }),
        {
          headers: adminInternalHeaders,
          responseType: 'json',
        }
      );
      expect(getDeleted).toHaveStatusCode(200);
      expect(getDeleted.body.document.governance?.lifecycle?.status).toBe('deleted');
    });

    await apiTest.step('excludes the soft-deleted KI from the list', async () => {
      const listActive = await apiClient.get(withQuery(kiListPath(AI_INDEX_ID), { size: 25 }), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(listActive).toHaveStatusCode(200);
      expect(listActive.body.kis.map((row: { id: string }) => row.id)).not.toContain(KI_ID);
    });

    await apiTest.step('rejects an update to the soft-deleted KI with 409', async () => {
      const patchDeleted = await apiClient.patch(kiPath, {
        headers: writerInternalHeaders,
        responseType: 'json',
        body: { ki: { content: 'Should not apply' } },
      });
      expect(patchDeleted).toHaveStatusCode(409);
    });

    await apiTest.step('restores the soft-deleted KI', async () => {
      const restoreResponse = await apiClient.post(kiRestorePath(AI_INDEX_ID, KI_ID), {
        headers: writerInternalHeaders,
        responseType: 'json',
      });
      expect(restoreResponse).toHaveStatusCode(200);
      expect(restoreResponse.body).toStrictEqual({ id: KI_ID });

      const getRestored = await apiClient.get(withQuery(kiPath, { index: DEST_INDEX }), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(getRestored).toHaveStatusCode(200);
      // Restore only flips the lifecycle status; the earlier content update must survive.
      expect(getRestored.body.document).toMatchObject({ content: 'Updated by scout' });
    });

    await apiTest.step('is idempotent on a repeated delete', async () => {
      const deleteAgain = await apiClient.delete(kiPath, {
        headers: writerInternalHeaders,
        responseType: 'json',
      });
      expect(deleteAgain).toHaveStatusCode(200);

      const deleteIdempotent = await apiClient.delete(kiPath, {
        headers: writerInternalHeaders,
        responseType: 'json',
      });
      expect(deleteIdempotent).toHaveStatusCode(200);
      expect(deleteIdempotent.body).toStrictEqual({ id: KI_ID });
    });
  });

  apiTest('updates a KI on a data stream dest by appending a revision', async ({ apiClient }) => {
    const kiPath = kiByIdPath(DS_AI_INDEX_ID, DS_KI_ID);

    const patchResponse = await apiClient.patch(kiPath, {
      headers: writerInternalHeaders,
      responseType: 'json',
      body: { ki: { content: 'Data stream updated' } },
    });
    expect(patchResponse).toHaveStatusCode(200);
    expect(patchResponse.body).toStrictEqual({ id: DS_KI_ID, status: 'updated' });

    const getResponse = await apiClient.get(withQuery(kiPath, { index: DS_DEST }), {
      headers: adminInternalHeaders,
      responseType: 'json',
    });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.document).toMatchObject({ content: 'Data stream updated' });
  });

  apiTest('rejects KI writes for users without write privilege', async ({ apiClient }) => {
    const kiPath = kiByIdPath(AI_INDEX_ID, KI_ID);

    await apiTest.step('rejects an update', async () => {
      const patchResponse = await apiClient.patch(kiPath, {
        headers: viewerInternalHeaders,
        responseType: 'json',
        body: { ki: { content: 'Viewer cannot write' } },
      });
      expect(patchResponse).toHaveStatusCode(403);
    });

    await apiTest.step('rejects a delete', async () => {
      const deleteResponse = await apiClient.delete(kiPath, {
        headers: viewerInternalHeaders,
        responseType: 'json',
      });
      expect(deleteResponse).toHaveStatusCode(403);
    });

    await apiTest.step('rejects a restore', async () => {
      const restoreResponse = await apiClient.post(kiRestorePath(AI_INDEX_ID, KI_ID), {
        headers: viewerInternalHeaders,
        responseType: 'json',
      });
      expect(restoreResponse).toHaveStatusCode(403);
    });
  });
});
