/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, FEATURE_PRIVILEGED_ROLE, REGION_POLICY_API_PATH } from '../constants';

apiTest.describe('Region policy CRUD', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE));

    await apiClient.delete(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await apiClient.delete(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });
  });

  apiTest('GET returns 404 when no policy exists', async ({ apiClient }) => {
    const response = await apiClient.get(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.message).toBeDefined();
  });

  apiTest('PUT creates a geo policy and GET returns it', async ({ apiClient }) => {
    const policy = { allowed_geos: ['us', 'eu'] };

    const putResponse = await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(policy),
    });

    expect(putResponse).toHaveStatusCode(200);
    expect(putResponse.body.region_policy.allowed_geos).toStrictEqual(
      expect.arrayContaining(['us', 'eu'])
    );
    expect(putResponse.body.created_at).toBeDefined();
    expect(putResponse.body.created_by).toBeDefined();

    const getResponse = await apiClient.get(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.region_policy.allowed_geos).toStrictEqual(
      expect.arrayContaining(['us', 'eu'])
    );
    expect(getResponse.body.region_policy.allowed_regions).toBeUndefined();
    expect(getResponse.body.created_at).toBeDefined();
    expect(getResponse.body.created_by).toBeDefined();
  });

  apiTest('PUT geo policy overwrites an existing geo policy', async ({ apiClient }) => {
    await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ allowed_geos: ['us'] }),
    });

    const updateResponse = await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ allowed_geos: ['eu', 'apac'] }),
    });

    expect(updateResponse).toHaveStatusCode(200);
    expect(updateResponse.body.region_policy.allowed_geos).toStrictEqual(
      expect.arrayContaining(['eu', 'apac'])
    );
    expect(updateResponse.body.region_policy.allowed_geos).not.toContain('us');

    const getResponse = await apiClient.get(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(getResponse.body.region_policy.allowed_geos).toStrictEqual(
      expect.arrayContaining(['eu', 'apac'])
    );
    expect(getResponse.body.region_policy.allowed_geos).not.toContain('us');
  });

  apiTest('PUT creates a regions policy and GET returns it', async ({ apiClient }) => {
    const policy = {
      allowed_regions: [
        { csp: 'aws', region: 'us-east-1' },
        { csp: 'gcp', region: 'eu-west1' },
      ],
    };

    const putResponse = await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(policy),
    });

    expect(putResponse).toHaveStatusCode(200);
    expect(putResponse.body.region_policy.allowed_regions).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ csp: 'aws', region: 'us-east-1' }),
        expect.objectContaining({ csp: 'gcp', region: 'eu-west1' }),
      ])
    );
    expect(putResponse.body.created_at).toBeDefined();
    expect(putResponse.body.created_by).toBeDefined();

    const getResponse = await apiClient.get(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.region_policy.allowed_regions).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ csp: 'aws', region: 'us-east-1' }),
        expect.objectContaining({ csp: 'gcp', region: 'eu-west1' }),
      ])
    );
    expect(getResponse.body.region_policy.allowed_geos).toBeUndefined();
  });

  apiTest('DELETE removes an existing policy', async ({ apiClient }) => {
    await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ allowed_geos: ['us'] }),
    });

    const deleteResponse = await apiClient.delete(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(deleteResponse).toHaveStatusCode(200);
    expect(deleteResponse.body.acknowledged).toBe(true);
  });

  apiTest('DELETE is idempotent when no policy exists', async ({ apiClient }) => {
    const deleteResponse = await apiClient.delete(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(deleteResponse).toHaveStatusCode(404);
    expect(deleteResponse.body.message).toBeDefined();
  });

  apiTest('PUT with both allowed_geos and allowed_regions returns 400', async ({ apiClient }) => {
    const response = await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({
        allowed_geos: ['us'],
        allowed_regions: [{ csp: 'aws', region: 'us-east-1' }],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBeDefined();
  });

  apiTest(
    'PUT with an empty payload is accepted (all fields are optional)',
    async ({ apiClient }) => {
      const response = await apiClient.put(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({}),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toBeDefined();
    }
  );
});
