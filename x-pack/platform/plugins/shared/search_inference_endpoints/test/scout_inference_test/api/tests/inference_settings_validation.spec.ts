/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, FEATURE_PRIVILEGED_ROLE, INFERENCE_SETTINGS_API_PATH } from '../constants';

apiTest.describe('Inference settings validation', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE));
  });

  apiTest('rejects duplicate feature_id values', async ({ apiClient }) => {
    const response = await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({
        features: [
          { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-a' }] },
          { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
        ],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ message: 'Invalid inference settings' });
    expect(response.body.attributes.errors[0]).toContain('Duplicate feature_id');
  });

  apiTest('rejects duplicate endpoints within a feature', async ({ apiClient }) => {
    const response = await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
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
    expect(response.body).toMatchObject({ message: 'Invalid inference settings' });
    expect(response.body.attributes.errors[0]).toContain('Duplicate endpoints');
  });

  apiTest('rejects an empty feature_id', async ({ apiClient }) => {
    const response = await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({
        features: [{ feature_id: '', endpoints: [{ id: '.endpoint-a' }] }],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('feature_id');
  });

  apiTest('rejects a missing features field', async ({ apiClient }) => {
    const response = await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({}),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('features');
  });
});
