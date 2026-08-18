/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  buildRuleTemplateData,
  buildV1RuleTemplateAttributes,
  getRuleTemplateUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Get rule template API', { tag: tags.deploymentAgnostic }, () => {
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...cookieHeader, ...testData.COMMON_HEADERS };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.cleanUp();
  });

  apiTest(
    'should return the template with the create-rule payload it installs',
    async ({ apiClient, apiServices }) => {
      const rule = buildCreateRuleData({
        metadata: {
          name: 'nginx-error-rate',
          description: 'Alerts on the share of 5xx responses',
          tags: ['nginx', 'observability'],
        },
      });
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'nginx-error-rate',
        attributes: { engine: 'v2', rule },
      });

      const response = await apiClient.get(getRuleTemplateUrl('nginx-error-rate'), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: 'nginx-error-rate', engine: 'v2', rule });
    }
  );

  apiTest('should return 404 when no template has that id', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleTemplateUrl('does-not-exist'), {
      headers: adminHeaders,
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

      const response = await apiClient.get(getRuleTemplateUrl('legacy-template'), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('RULE_TEMPLATE_NOT_FOUND');
    }
  );

  apiTest(
    'should return 404 when the stored payload is no longer valid',
    async ({ apiClient, apiServices }) => {
      // The saved object schema treats `rule` as an opaque bag, so drifted
      // content only fails when the route parses it. A template that cannot be
      // turned into create-rule data is not usable, hence "not found".
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'broken-template',
        attributes: { engine: 'v2', rule: { kind: 'alert' } },
      });

      const response = await apiClient.get(getRuleTemplateUrl('broken-template'), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('RULE_TEMPLATE_NOT_FOUND');
    }
  );

  apiTest(
    'authorization: should return 200 for a user with read-only rules privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'visible-to-readers',
        attributes: buildRuleTemplateData({ metadata: { name: 'visible-to-readers' } }),
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_RULES_READ_ROLE);

      const response = await apiClient.get(getRuleTemplateUrl('visible-to-readers'), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe('visible-to-readers');
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'hidden-template',
        attributes: buildRuleTemplateData({ metadata: { name: 'hidden-template' } }),
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_ACCESS_ROLE);

      const response = await apiClient.get(getRuleTemplateUrl('hidden-template'), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
