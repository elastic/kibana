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
  buildRuleTemplateData,
  getRuleUrl,
  testData,
} from '../fixtures';

const TEMPLATE_ID = 'template-1';
const TEMPLATE = { id: TEMPLATE_ID };

apiTest.describe('Rule metadata.template', { tag: testData.API_ENGINE_NON_MKI_TAG }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };

    await apiServices.alertingV2.ruleTemplates.cleanUp();
    await apiServices.alertingV2.ruleTemplates.create({
      id: TEMPLATE_ID,
      attributes: buildRuleTemplateData({ metadata: { name: 'metadata-template-source' } }),
    });
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

  const installTemplate = async (
    apiServices: AlertingApiServicesFixture,
    name: string
  ): Promise<{ id: string }> => {
    const created = await apiServices.alertingV2.ruleTemplates.install(
      TEMPLATE_ID,
      buildCreateRuleData({ metadata: { name } })
    );
    createdRuleIds.push(created.id);
    return created;
  };

  apiTest.afterEach(async ({ apiServices }) => {
    await Promise.all(createdRuleIds.map((id) => apiServices.alertingV2.rules.delete(id)));
    createdRuleIds.length = 0;
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.cleanUp();
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

    const stored = await apiServices.alertingV2.ruleSavedObject.getAttributes(created.id);
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
    'get and find: do not return metadata.template even when it is stored',
    async ({ apiClient, apiServices }) => {
      const created = await installTemplate(apiServices, 'from-template');

      const getResponse = await apiClient.get(getRuleUrl(created.id), { headers: writerHeaders });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.metadata.template).toBeUndefined();

      const findResponse = await apiClient.get(
        `${testData.RULE_API_PATH}?filter=${encodeURIComponent(`id: "${created.id}"`)}`,
        { headers: writerHeaders }
      );
      expect(findResponse).toHaveStatusCode(200);
      const found = findResponse.body.items.find((item: { id: string }) => item.id === created.id);
      // The rule stays discoverable through find; only its template is withheld.
      expect(found?.id).toBe(created.id);
      expect(found?.metadata.template).toBeUndefined();

      // The link stays in storage; only the public response omits it.
      const stored = await apiServices.alertingV2.ruleSavedObject.getAttributes(created.id);
      expect(stored.metadata.template).toStrictEqual(TEMPLATE);
    }
  );

  apiTest(
    'update: keeps metadata.template in storage without returning it',
    async ({ apiClient, apiServices }) => {
      const created = await installTemplate(apiServices, 'update-keeps-template');

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { name: 'update-keeps-template-renamed' } },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.template).toBeUndefined();

      const stored = await apiServices.alertingV2.ruleSavedObject.getAttributes(created.id);
      expect(stored.metadata.template).toStrictEqual(TEMPLATE);
    }
  );

  apiTest(
    'upsert: keeps metadata.template in storage on an existing rule without returning it',
    async ({ apiClient, apiServices }) => {
      const created = await installTemplate(apiServices, 'upsert-keeps-template');

      const response = await apiClient.put(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: buildCreateRuleData({ metadata: { name: 'upsert-keeps-template-replaced' } }),
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.template).toBeUndefined();

      const stored = await apiServices.alertingV2.ruleSavedObject.getAttributes(created.id);
      expect(stored.metadata.template).toStrictEqual(TEMPLATE);
    }
  );
});
