/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import {
  API_BASE_PATH,
  ILM_API_ROLE,
  ILM_READ_ONLY_ROLE,
  getHeaders,
  getResourceName,
} from '../fixtures/constants';
import { deletePolicy, getPolicyPayload, putPolicy } from '../fixtures/policies';

interface PolicyListItem {
  name: string;
  indices: string[];
  policy: { _meta?: Record<string, unknown> };
}

apiTest.describe('Index Lifecycle Management - policies', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;
  let readOnlyCredentials: RoleApiCredentials;
  const createdPolicies = new Set<string>();
  const createdIndices = new Set<string>();
  const createdDataStreams = new Set<string>();
  const createdComposableTemplates = new Set<string>();

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
    readOnlyCredentials = await requestAuth.getApiKeyForCustomRole(ILM_READ_ONLY_ROLE);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await Promise.all(
      [...createdDataStreams].map((name) =>
        esClient.indices.deleteDataStream({ name }, { ignore: [404] })
      )
    );
    await Promise.all(
      [...createdComposableTemplates].map((name) =>
        esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] })
      )
    );
    if (createdIndices.size > 0) {
      await esClient.indices.delete({ index: [...createdIndices] }, { ignore: [404] });
    }
    // Indices go first: ES refuses to delete a policy that is still in use.
    await Promise.all([...createdPolicies].map((name) => deletePolicy(esClient, name)));
    [createdDataStreams, createdComposableTemplates, createdIndices, createdPolicies].forEach(
      (set) => set.clear()
    );
  });

  apiTest('lists the indices linked to a policy', async ({ apiClient, esClient }) => {
    const policy = getPolicyPayload(getResourceName('link-policy'));
    createdPolicies.add(policy.name);
    await putPolicy(esClient, policy);

    const indexName = getResourceName('link-index');
    createdIndices.add(indexName);
    await esClient.indices.create({
      index: indexName,
      settings: { 'index.lifecycle.name': policy.name },
    });

    const response = await apiClient.get<PolicyListItem[]>(`${API_BASE_PATH}/policies`, {
      headers: getHeaders(credentials),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const fetchedPolicy = response.body.find((p) => p.name === policy.name);
    expect(fetchedPolicy?.indices).toStrictEqual([indexName]);
  });

  apiTest('lists hidden indices linked to a policy', async ({ apiClient, esClient }) => {
    const policy = getPolicyPayload(getResourceName('hidden-link-policy'));
    createdPolicies.add(policy.name);
    await putPolicy(esClient, policy);

    const dataStreamName = getResourceName('hidden-ds');
    createdComposableTemplates.add(dataStreamName);
    await esClient.indices.putIndexTemplate({
      name: dataStreamName,
      index_patterns: [`${dataStreamName}*`],
      data_stream: { hidden: true },
      template: {},
    });
    createdDataStreams.add(dataStreamName);
    await esClient.index({ index: dataStreamName, document: { '@timestamp': '2020-01-27' } });
    await esClient.indices.putSettings({
      index: dataStreamName,
      settings: { 'index.lifecycle.name': policy.name },
    });

    const response = await apiClient.get<PolicyListItem[]>(`${API_BASE_PATH}/policies`, {
      headers: getHeaders(credentials),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const fetchedPolicy = response.body.find((p) => p.name === policy.name);
    // Backing indices are named `.ds-<data stream>-<date>-<generation>`.
    expect(fetchedPolicy?.indices).toHaveLength(1);
    expect(fetchedPolicy?.indices[0]).toMatch(new RegExp(`^\\.ds-${dataStreamName}-`));
  });

  apiTest('creates a lifecycle policy', async ({ apiClient, esClient }) => {
    const { name, ...policy } = getPolicyPayload(getResourceName('create-policy'));

    createdPolicies.add(name);
    const response = await apiClient.post(`${API_BASE_PATH}/policies`, {
      headers: getHeaders(credentials),
      responseType: 'json',
      body: { name, ...policy },
    });

    expect(response).toHaveStatusCode(200);
    const policyFromEs = await esClient.ilm.getLifecycle({ name });
    // ES fills in action defaults (e.g. `delete_searchable_snapshot`), so match the sent subset.
    expect(policyFromEs[name].policy.phases).toMatchObject(policy.phases);
  });

  apiTest('rejects creating a policy without manage_ilm', async ({ apiClient, esClient }) => {
    const { name, ...policy } = getPolicyPayload(getResourceName('forbidden-policy'));

    createdPolicies.add(name);
    const response = await apiClient.post(`${API_BASE_PATH}/policies`, {
      headers: getHeaders(readOnlyCredentials),
      responseType: 'json',
      body: { name, ...policy },
    });

    expect(response).toHaveStatusCode(403);
    const policyFromEs = await esClient.ilm.getLifecycle({ name }, { ignore: [404] });
    expect(Object.keys(policyFromEs)).not.toContain(name);
  });

  apiTest('keeps the _meta field when editing a policy', async ({ apiClient, esClient }) => {
    const basePolicy = getPolicyPayload(getResourceName('edit-meta-policy'));
    const policy = { ...basePolicy, _meta: { description: 'test policy with _meta field' } };
    createdPolicies.add(policy.name);
    await putPolicy(esClient, policy);

    // Only change the warm phase timing (seeded as `10d`), keeping `_meta` as is.
    const editedPolicy = {
      ...policy,
      phases: { ...policy.phases, warm: { ...policy.phases.warm, min_age: '2d' } },
    };

    // Edit uses the same route as create.
    const response = await apiClient.post(`${API_BASE_PATH}/policies`, {
      headers: getHeaders(credentials),
      responseType: 'json',
      body: editedPolicy,
    });

    expect(response).toHaveStatusCode(200);
    const policyFromEs = await esClient.ilm.getLifecycle({ name: policy.name });
    expect(policyFromEs[policy.name].policy.phases.warm?.min_age).toBe('2d');
    expect(policyFromEs[policy.name].policy._meta).toStrictEqual(editedPolicy._meta);

    const listResponse = await apiClient.get<PolicyListItem[]>(`${API_BASE_PATH}/policies`, {
      headers: getHeaders(credentials),
      responseType: 'json',
    });
    expect(listResponse).toHaveStatusCode(200);
    const loadedPolicy = listResponse.body.find((p) => p.name === policy.name);
    expect(loadedPolicy?.policy._meta).toStrictEqual(editedPolicy._meta);
  });

  apiTest('deletes a policy', async ({ apiClient, esClient }) => {
    const policy = getPolicyPayload(getResourceName('delete-policy'));
    createdPolicies.add(policy.name);
    await putPolicy(esClient, policy);

    const response = await apiClient.delete(`${API_BASE_PATH}/policies/${policy.name}`, {
      headers: getHeaders(credentials),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const policyFromEs = await esClient.ilm.getLifecycle({ name: policy.name }, { ignore: [404] });
    expect(Object.keys(policyFromEs)).not.toContain(policy.name);
  });
});
