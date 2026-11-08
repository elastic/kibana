/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { EsClient, RoleApiCredentials } from '@kbn/scout';

import { API_BASE_PATH, ILM_API_ROLE, getHeaders, getResourceName } from '../fixtures/constants';
import { deletePolicy, getPolicyPayload, putPolicy } from '../fixtures/policies';

apiTest.describe('Index Lifecycle Management - indices', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;
  const createdIndices = new Set<string>();
  const createdPolicies = new Set<string>();

  // Seeds a policy and an index (optionally already attached) directly in ES.
  const seedPolicyAndIndex = async (esClient: EsClient, { attached }: { attached: boolean }) => {
    const policy = getPolicyPayload(getResourceName('policy'));
    createdPolicies.add(policy.name);
    await putPolicy(esClient, policy);

    const indexName = getResourceName('index');
    createdIndices.add(indexName);
    await esClient.indices.create({
      index: indexName,
      settings: attached ? { 'index.lifecycle.name': policy.name } : {},
    });

    return { policyName: policy.name, indexName };
  };

  const getLifecycleSettings = async (esClient: EsClient, indexName: string) => {
    const index = await esClient.indices.get({ index: indexName });
    return index[indexName].settings?.index?.lifecycle;
  };

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
  });

  apiTest.afterEach(async ({ esClient }) => {
    if (createdIndices.size > 0) {
      await esClient.indices.delete({ index: [...createdIndices] }, { ignore: [404] });
    }
    await Promise.all([...createdPolicies].map((name) => deletePolicy(esClient, name)));
    createdIndices.clear();
    createdPolicies.clear();
  });

  apiTest('adds a lifecycle policy to an index', async ({ apiClient, esClient }) => {
    const { policyName, indexName } = await seedPolicyAndIndex(esClient, { attached: false });
    const rolloverAlias = getResourceName('alias');

    const response = await apiClient.post(`${API_BASE_PATH}/index/add`, {
      headers: getHeaders(credentials),
      responseType: 'json',
      body: { indexName, policyName, alias: rolloverAlias },
    });

    expect(response).toHaveStatusCode(200);
    expect(await getLifecycleSettings(esClient, indexName)).toStrictEqual({
      name: policyName,
      rollover_alias: rolloverAlias,
    });
  });

  apiTest('removes a lifecycle policy from an index', async ({ apiClient, esClient }) => {
    const { policyName, indexName } = await seedPolicyAndIndex(esClient, { attached: true });
    expect((await getLifecycleSettings(esClient, indexName))?.name).toBe(policyName);

    const response = await apiClient.post(`${API_BASE_PATH}/index/remove`, {
      headers: getHeaders(credentials),
      responseType: 'json',
      body: { indexNames: [indexName] },
    });

    expect(response).toHaveStatusCode(200);
    expect(await getLifecycleSettings(esClient, indexName)).toBeUndefined();
  });

  apiTest(
    'retries a policy on an index through the ES "_ilm/retry" endpoint',
    async ({ apiClient, esClient }) => {
      const { indexName } = await seedPolicyAndIndex(esClient, { attached: true });

      // There is no easy way to put an index in the ERROR step, so we validate that the error
      // returned *is* coming from the ES "_ilm/retry" endpoint.
      const response = await apiClient.post(`${API_BASE_PATH}/index/retry`, {
        headers: getHeaders(credentials),
        responseType: 'json',
        body: { indexNames: [indexName] },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        `cannot retry an action for an index [${indexName}] that has not encountered an error when running a Lifecycle Policy`
      );
    }
  );
});
