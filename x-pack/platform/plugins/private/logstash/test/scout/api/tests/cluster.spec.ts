/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

// The route calls client.asCurrentUser.info() which requires the ES `monitor` cluster privilege.
// The built-in `viewer` Kibana role has no ES cluster privileges and produces a non-403 error
// that bypasses the route's catch block, resulting in a 500. A custom role with `monitor` is
// the minimum required privilege.
apiTest.describe('GET /api/logstash/cluster', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(testData.LOGSTASH_CLUSTER_ROLE);
  });

  apiTest('should return the ES cluster info', async ({ apiClient, esClient }) => {
    const response = await apiClient.get(testData.API_PATHS.CLUSTER, {
      headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.cluster).toBeDefined();

    const esInfo = await esClient.info();
    expect(response.body.cluster.uuid).toBe(esInfo.cluster_uuid);
  });
});
