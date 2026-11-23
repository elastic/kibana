/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import {
  API_BASE_PATH,
  ILM_API_ROLE,
  NODE_CUSTOM_ATTRIBUTE,
  getHeaders,
} from '../fixtures/constants';

// Local stateful only: Cloud disallows custom node attributes, so `NODE_CUSTOM_ATTRIBUTE` (set in the
// Scout stateful base config) can't be used to resolve the expected node ids there.
apiTest.describe('Index Lifecycle Management - nodes', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
  });

  apiTest('lists the ES nodes for each custom attribute', async ({ apiClient, esClient }) => {
    const nodeIds = Object.keys((await esClient.nodes.stats()).nodes);

    const response = await apiClient.get(`${API_BASE_PATH}/nodes/list`, {
      headers: getHeaders(credentials),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.isUsingDeprecatedDataRoleConfig).toBe(false);
    expect(response.body.nodesByAttributes[NODE_CUSTOM_ATTRIBUTE]).toStrictEqual(nodeIds);
  });

  apiTest('returns the node stats for a custom node attribute', async ({ apiClient, esClient }) => {
    const [nodeId] = Object.keys((await esClient.nodes.stats()).nodes);

    const response = await apiClient.get(
      `${API_BASE_PATH}/nodes/${NODE_CUSTOM_ATTRIBUTE}/details`,
      { headers: getHeaders(credentials), responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body[0].nodeId).toBe(nodeId);
  });
});
