/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { API_ENGINE_TAG } from '../../../common/constants';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  buildRuleTemplateData,
  buildV1RuleTemplateAttributes,
  getInstallRuleTemplateUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Install rule template API', { tag: API_ENGINE_TAG }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest('should create the rule from the body', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.create({
      id: 'nginx-error-rate',
      attributes: buildRuleTemplateData({ metadata: { name: 'nginx-error-rate' } }),
    });
    const body = buildCreateRuleData({
      metadata: { name: 'nginx-error-rate-edited', tags: ['nginx'] },
      schedule: { every: '5m', lookback: '10m' },
    });

    const response = await apiClient.post(getInstallRuleTemplateUrl('nginx-error-rate'), {
      headers: writerHeaders,
      body,
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.metadata).toMatchObject({
      name: 'nginx-error-rate-edited',
      tags: ['nginx'],
    });
    expect(response.body.schedule).toStrictEqual(body.schedule);
    expect(response.body.enabled).toBe(true);

    const persisted = await apiServices.alertingV2.rules.get(response.body.id);
    expect(persisted.metadata.name).toBe('nginx-error-rate-edited');
  });

  apiTest('should not let the body choose the template', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.create({
      id: 'real-template',
      attributes: buildRuleTemplateData({ metadata: { name: 'real-template' } }),
    });
    const body = buildCreateRuleData({ metadata: { name: 'forged-template' } });

    const response = await apiClient.post(getInstallRuleTemplateUrl('real-template'), {
      headers: writerHeaders,
      body: { ...body, metadata: { ...body.metadata, template: { id: 'other-template' } } },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'should return 400 when the body is not a valid rule',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'valid-template',
        attributes: buildRuleTemplateData({ metadata: { name: 'valid-template' } }),
      });

      const response = await apiClient.post(getInstallRuleTemplateUrl('valid-template'), {
        headers: writerHeaders,
        body: { kind: 'alert' },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('should return 404 when no template has that id', async ({ apiClient }) => {
    const response = await apiClient.post(getInstallRuleTemplateUrl('does-not-exist'), {
      headers: writerHeaders,
      body: buildCreateRuleData({ metadata: { name: 'orphan' } }),
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_TEMPLATE_NOT_FOUND');
  });

  apiTest(
    'should return 404 for a template that belongs to another engine',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'legacy-template',
        attributes: buildV1RuleTemplateAttributes({ name: 'legacy-template' }),
      });

      const response = await apiClient.post(getInstallRuleTemplateUrl('legacy-template'), {
        headers: writerHeaders,
        body: buildCreateRuleData({ metadata: { name: 'from-legacy' } }),
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('RULE_TEMPLATE_NOT_FOUND');
    }
  );

  apiTest(
    'should not create a rule when the template cannot be installed',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'broken-template',
        attributes: { engine: 'v2', rule: { kind: 'alert' } },
      });

      const response = await apiClient.post(getInstallRuleTemplateUrl('broken-template'), {
        headers: writerHeaders,
        body: buildCreateRuleData({ metadata: { name: 'from-broken' } }),
      });

      expect(response).toHaveStatusCode(404);
      const rules = await apiServices.alertingV2.rules.find({ search: 'from-broken' });
      expect(rules.items).toHaveLength(0);
    }
  );

  apiTest(
    'authorization: should return 403 for a user with read-only rules privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'read-only-template',
        attributes: buildRuleTemplateData({ metadata: { name: 'read-only-template' } }),
      });
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );

      const response = await apiClient.post(getInstallRuleTemplateUrl('read-only-template'), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: buildCreateRuleData({ metadata: { name: 'reader-cannot-install' } }),
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'no-access-template',
        attributes: buildRuleTemplateData({ metadata: { name: 'no-access-template' } }),
      });
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(getInstallRuleTemplateUrl('no-access-template'), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: buildCreateRuleData({ metadata: { name: 'no-access-cannot-install' } }),
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
