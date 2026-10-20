/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';
import {
  RUN_SAVED_MINIMAL_ROLE,
  RUN_SAVED_WITH_PACKS_READ_ROLE,
  RUN_SAVED_WITH_SAVED_QUERIES_READ_ROLE,
  T1_ANALYST_ROLE,
  WRITE_LIVE_MINIMAL_ROLE,
} from '../fixtures/roles';

apiTest.describe(
  'Osquery RBAC - running a pack or saved query requires read access to it',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    const credentials: Record<string, RoleApiCredentials> = {};
    let packSavedObjectId: string;
    let savedQueryId: string;
    let savedQuerySoId: string;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const roles: Record<string, KibanaRole> = {
        runSavedMinimal: RUN_SAVED_MINIMAL_ROLE,
        runSavedWithPacksRead: RUN_SAVED_WITH_PACKS_READ_ROLE,
        runSavedWithSavedQueriesRead: RUN_SAVED_WITH_SAVED_QUERIES_READ_ROLE,
        writeLiveMinimal: WRITE_LIVE_MINIMAL_ROLE,
        t1Analyst: T1_ANALYST_ROLE,
      };

      for (const [name, role] of Object.entries(roles)) {
        credentials[name] = await requestAuth.getApiKeyForCustomRole(role);
      }

      const packResponse = await apiServices.osquery.packs.create(testData.getMinimalPack());
      packSavedObjectId = (packResponse.data as Record<string, Record<string, string>>).data
        .saved_object_id;

      const savedQueryResponse = await apiServices.osquery.savedQueries.create(
        testData.getMinimalSavedQuery()
      );
      const savedQueryData = (savedQueryResponse.data as Record<string, Record<string, string>>)
        .data;
      savedQueryId = savedQueryData.id;
      savedQuerySoId = savedQueryData.saved_object_id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      if (packSavedObjectId) {
        await apiServices.osquery.packs.delete(packSavedObjectId);
      }

      if (savedQuerySoId) {
        await apiServices.osquery.savedQueries.delete(savedQuerySoId);
      }
    });

    const runLiveQuery = (
      apiClient: ApiClientFixture,
      role: string,
      body: Record<string, unknown>
    ) =>
      apiClient.post(testData.API_PATHS.OSQUERY_LIVE_QUERIES, {
        headers: { ...testData.COMMON_HEADERS, ...credentials[role].apiKeyHeader },
        body,
        responseType: 'json',
      });

    const packLiveQuery = () => ({ agent_all: true, kuery: '', pack_id: packSavedObjectId });

    // Allowed cases assert "not 403": without enrolled agents dispatch may still fail, but the
    // authorization boundary is what is under test.

    apiTest('returns 403 when running a pack without Packs read', async ({ apiClient }) => {
      const response = await runLiveQuery(apiClient, 'runSavedMinimal', packLiveQuery());

      expect(response).toHaveStatusCode(403);
    });

    apiTest('is not rejected when running a pack with Packs read', async ({ apiClient }) => {
      const response = await runLiveQuery(apiClient, 'runSavedWithPacksRead', packLiveQuery());

      expect(response.statusCode).not.toBe(403);
    });

    apiTest(
      'returns 403 when running a saved query without Saved queries read',
      async ({ apiClient }) => {
        const response = await runLiveQuery(
          apiClient,
          'runSavedMinimal',
          testData.getSavedQueryLiveQuery(savedQueryId)
        );

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'is not rejected when running a saved query with Saved queries read',
      async ({ apiClient }) => {
        const response = await runLiveQuery(
          apiClient,
          'runSavedWithSavedQueriesRead',
          testData.getSavedQueryLiveQuery(savedQueryId)
        );

        expect(response.statusCode).not.toBe(403);
      }
    );

    apiTest(
      'returns 403 when a live query writer without Packs read runs a pack',
      async ({ apiClient }) => {
        const response = await runLiveQuery(apiClient, 'writeLiveMinimal', packLiveQuery());

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'is not rejected when a live query writer without Packs read runs its own query',
      async ({ apiClient }) => {
        const response = await runLiveQuery(
          apiClient,
          'writeLiveMinimal',
          testData.getMinimalLiveQuery()
        );

        expect(response.statusCode).not.toBe(403);
      }
    );

    apiTest(
      'is not rejected when a t1_analyst (osquery read + run saved queries) runs a pack',
      async ({ apiClient }) => {
        const response = await runLiveQuery(apiClient, 't1Analyst', packLiveQuery());

        expect(response.statusCode).not.toBe(403);
      }
    );
  }
);
