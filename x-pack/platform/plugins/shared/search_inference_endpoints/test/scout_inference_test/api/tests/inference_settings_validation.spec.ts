/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_PATH, COMMON_HEADERS } from '../constants';

apiTest.describe('Inference settings validation', { tag: tags.deploymentAgnostic }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
  });

  apiTest('rejects duplicate feature_id values', async ({ apiClient }) => {
    const response = await apiClient.put(API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({
        features: [
          { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-a' }] },
          { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
        ],
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects duplicate endpoints within a feature', async ({ apiClient }) => {
    const response = await apiClient.put(API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.endpoint-a' }, { id: '.endpoint-a' }],
          },
        ],
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects an empty feature_id', async ({ apiClient }) => {
    const response = await apiClient.put(API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({
        features: [{ feature_id: '', endpoints: [{ id: '.endpoint-a' }] }],
      }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('rejects a missing features field', async ({ apiClient }) => {
    const response = await apiClient.put(API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({}),
    });

    expect(response).toHaveStatusCode(400);
  });
});
