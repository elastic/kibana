/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { NoIndicesMeteringError, NoPrivilegeMeteringError } from '../../../../server/errors';
import {
  apiTest,
  createDataStream,
  deleteDataStream,
  getDataStreams,
  LOCAL_SERVERLESS_TAGS,
  METERING_TIMEOUT_MS,
} from '../fixtures';

const ALLOWED_DATA_STREAM = 'scout-du-api-allowed';
const OTHER_DATA_STREAM = 'scout-du-api-other';
const DATA_STREAMS = [ALLOWED_DATA_STREAM, OTHER_DATA_STREAM];

const roleWithIndices = (names: string[], privileges: string[]) => ({
  elasticsearch: { cluster: [], indices: [{ names, privileges }] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
});

// The metering API this route calls requires one of: monitor, view_index_metadata, manage, all
apiTest.describe('Data Usage data streams API privileges', { tag: LOCAL_SERVERLESS_TAGS }, () => {
  apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
    for (const name of DATA_STREAMS) {
      await deleteDataStream(esClient, name);
      await createDataStream(esClient, name);
    }
    const admin = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
    await expect
      .poll(
        async () => {
          const { names } = await getDataStreams(apiClient, admin);
          return DATA_STREAMS.every((name) => names.includes(name));
        },
        { timeout: METERING_TIMEOUT_MS }
      )
      .toBe(true);
  });

  apiTest.afterAll(async ({ esClient }) => {
    for (const name of DATA_STREAMS) {
      await deleteDataStream(esClient, name);
    }
  });

  apiTest(
    'returns all data streams for indices with the required privileges',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        roleWithIndices(['*'], ['all'])
      );
      const { statusCode, names } = await getDataStreams(apiClient, apiKeyHeader);
      expect(statusCode).toBe(200);
      expect(names).toContain(ALLOWED_DATA_STREAM);
      expect(names).toContain(OTHER_DATA_STREAM);
    }
  );

  apiTest(
    'returns only the data streams the role has privileges for',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        roleWithIndices([`${ALLOWED_DATA_STREAM}*`], ['all'])
      );
      const { statusCode, names } = await getDataStreams(apiClient, apiKeyHeader);
      expect(statusCode).toBe(200);
      expect(names).toContain(ALLOWED_DATA_STREAM);
      expect(names).not.toContain(OTHER_DATA_STREAM);
    }
  );

  apiTest('returns 403 without the required privileges', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
      roleWithIndices(['*'], ['write'])
    );
    const { statusCode, body } = await getDataStreams(apiClient, apiKeyHeader);
    expect(statusCode).toBe(403);
    expect(body.message).toContain(new NoPrivilegeMeteringError().message);
  });

  apiTest(
    'returns 404 when the role has no matching data streams',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        roleWithIndices(['scout-du-api-none*'], ['all'])
      );
      const { statusCode, body } = await getDataStreams(apiClient, apiKeyHeader);
      expect(statusCode).toBe(404);
      expect(body.message).toContain(new NoIndicesMeteringError().message);
    }
  );
});
