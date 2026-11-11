/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

const { INTERNAL_API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_NAME = 'index-management-api-enrich-source';
const POLICY_NAME = 'index-management-api-enrich-policy';

const DELETE_ATTEMPTS = 20;

const createPolicy = async (esClient: EsClient) => {
  await esClient.indices.create({
    index: INDEX_NAME,
    mappings: { properties: { email: { type: 'text' }, firstName: { type: 'text' } } },
  });
  await esClient.enrich.putPolicy({
    name: POLICY_NAME,
    match: { match_field: 'email', enrich_fields: ['firstName'], indices: [INDEX_NAME] },
  });
};

const deletePolicy = async (esClient: EsClient) => {
  // Deleting a policy that is mid-execution is rejected while it holds the execution lock: 409, or
  // 429 (`es_rejected_execution_exception`). Retry until it goes through.
  const busy = [409, 429];
  for (let attempt = 1; ; attempt++) {
    const { statusCode } = await esClient.enrich.deletePolicy(
      { name: POLICY_NAME },
      { ignore: [404, ...busy], meta: true }
    );
    if (!busy.includes(statusCode)) {
      break;
    }
    if (attempt === DELETE_ATTEMPTS) {
      throw new Error(
        `Enrich policy "${POLICY_NAME}" was still executing after ${DELETE_ATTEMPTS} delete attempts`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
};

const cleanup = async (esClient: EsClient) => {
  await deletePolicy(esClient);
  await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
};

apiTest.describe('Enrich policies API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  // Each test seeds its own policy, so none of them depends on another having run first.
  apiTest.beforeEach(async ({ esClient }) => {
    await cleanup(esClient);
    await createPolicy(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanup(esClient);
  });

  apiTest('lists the enrich policies', async ({ apiClient }) => {
    const response = await apiClient.get(`${INTERNAL_API_BASE_PATH}/enrich_policies`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    // The cluster is shared, so assert on this suite's policy instead of the whole list.
    const policy = (response.body as Array<{ name: string }>).find(
      ({ name }) => name === POLICY_NAME
    );
    expect(policy).toStrictEqual({
      enrichFields: ['firstName'],
      matchField: 'email',
      name: POLICY_NAME,
      sourceIndices: [INDEX_NAME],
      type: 'match',
    });
  });

  apiTest('executes an enrich policy', async ({ apiClient }) => {
    const response = await apiClient.put(
      `${INTERNAL_API_BASE_PATH}/enrich_policies/${POLICY_NAME}`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
  });

  apiTest('deletes an enrich policy', async ({ apiClient }) => {
    // The policy has not been executed in this test, so the delete cannot race the execution lock
    // and a 429 is not expected.
    const response = await apiClient.delete(
      `${INTERNAL_API_BASE_PATH}/enrich_policies/${POLICY_NAME}`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
  });
});
