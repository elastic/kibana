/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  type AlertingApiServicesFixture,
  apiTest,
  buildCreateRuleData,
  getRuleUrl,
  testData,
} from '../fixtures';

const TEMPLATE = { id: 'template-1' };

apiTest.describe('Rule metadata.template', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  const createdRuleIds: string[] = [];

  const createRule = async (
    apiServices: AlertingApiServicesFixture,
    name: string
  ): Promise<{ id: string }> => {
    const created = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name } })
    );
    createdRuleIds.push(created.id);
    return created;
  };

  apiTest.afterEach(async ({ apiServices }) => {
    await Promise.all(createdRuleIds.map((id) => apiServices.alertingV2.rules.delete(id)));
    createdRuleIds.length = 0;
  });

  apiTest('create: rejects metadata.template in the body', async ({ apiClient }) => {
    const body = buildCreateRuleData({ metadata: { name: 'with-template' } });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: { ...body, metadata: { ...body.metadata, template: TEMPLATE } },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('update: rejects metadata.template in the body', async ({ apiClient, apiServices }) => {
    const created = await createRule(apiServices, 'update-rejects-template');
    const response = await apiClient.patch(getRuleUrl(created.id), {
      headers: writerHeaders,
      body: { metadata: { template: TEMPLATE } },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');

    const stored = await apiServices.alertingV2.rules.get(created.id);
    expect(stored.metadata.template).toBeUndefined();
  });

  apiTest('upsert: rejects metadata.template in the body', async ({ apiClient }) => {
    const body = buildCreateRuleData({ metadata: { name: 'upsert-rejects-template' } });
    const response = await apiClient.put(getRuleUrl('upsert-rejects-template'), {
      headers: writerHeaders,
      body: { ...body, metadata: { ...body.metadata, template: TEMPLATE } },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'get and find: return metadata.template when present',
    async ({ apiClient, apiServices }) => {
      const created = await createRule(apiServices, 'from-template');
      await apiServices.alertingV2.ruleSavedObject.setMetadataTemplate(created.id, TEMPLATE);

      const getResponse = await apiClient.get(getRuleUrl(created.id), { headers: writerHeaders });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.metadata.template).toStrictEqual(TEMPLATE);

      const findResponse = await apiClient.get(
        `${testData.RULE_API_PATH}?filter=${encodeURIComponent(`id: "${created.id}"`)}`,
        { headers: writerHeaders }
      );
      expect(findResponse).toHaveStatusCode(200);
      const found = findResponse.body.items.find((item: { id: string }) => item.id === created.id);
      expect(found?.metadata.template).toStrictEqual(TEMPLATE);
    }
  );

  apiTest('update: keeps metadata.template', async ({ apiClient, apiServices }) => {
    const created = await createRule(apiServices, 'update-keeps-template');
    await apiServices.alertingV2.ruleSavedObject.setMetadataTemplate(created.id, TEMPLATE);

    const response = await apiClient.patch(getRuleUrl(created.id), {
      headers: writerHeaders,
      body: { metadata: { name: 'update-keeps-template-renamed' } },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.metadata.template).toStrictEqual(TEMPLATE);

    const stored = await apiServices.alertingV2.rules.get(created.id);
    expect(stored.metadata.template).toStrictEqual(TEMPLATE);
  });

  apiTest(
    'upsert: keeps metadata.template on an existing rule',
    async ({ apiClient, apiServices }) => {
      const created = await createRule(apiServices, 'upsert-keeps-template');
      await apiServices.alertingV2.ruleSavedObject.setMetadataTemplate(created.id, TEMPLATE);

      const response = await apiClient.put(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: buildCreateRuleData({ metadata: { name: 'upsert-keeps-template-replaced' } }),
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.template).toStrictEqual(TEMPLATE);

      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.metadata.template).toStrictEqual(TEMPLATE);
    }
  );
});
