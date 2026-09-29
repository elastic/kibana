/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { MAX_TAG_LENGTH, TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildRuleTemplateData,
  buildV1RuleTemplateAttributes,
  getFindRuleTemplatesUrl,
  getRuleTemplateTagsUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Get rule template tags API', { tag: tags.deploymentAgnostic }, () => {
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
    'returns tags from all v2 templates independently of list pagination',
    async ({ apiClient, apiServices }) => {
      for (const { name, templateTags } of [
        { name: 'a-template', templateTags: ['first-page'] },
        { name: 'b-template', templateTags: ['second-page'] },
      ]) {
        await apiServices.alertingV2.ruleTemplates.create({
          id: name,
          attributes: buildRuleTemplateData({ metadata: { name, tags: templateTags } }),
        });
      }

      const firstPage = await apiClient.get(getFindRuleTemplatesUrl({ page: 1, per_page: 1 }), {
        headers: adminHeaders,
      });
      const response = await apiClient.get(getRuleTemplateTagsUrl(), { headers: adminHeaders });

      expect(firstPage).toHaveStatusCode(200);
      expect(firstPage.body.items).toHaveLength(1);
      expect(firstPage.body.items[0].rule.metadata.tags).toStrictEqual(['first-page']);
      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(
        expect.arrayContaining(['first-page', 'second-page'])
      );
    }
  );

  apiTest('returns at most 20 tags ordered by usage', async ({ apiClient, apiServices }) => {
    for (let i = 0; i < TAGS_RESPONSE_LIMIT + 1; i++) {
      const name = `template-${i}`;
      await apiServices.alertingV2.ruleTemplates.create({
        id: name,
        attributes: buildRuleTemplateData({
          metadata: { name, tags: [`tag-${i}`, ...(i < 2 ? ['frequent'] : [])] },
        }),
      });
    }

    const response = await apiClient.get(getRuleTemplateTagsUrl(), { headers: adminHeaders });

    expect(response).toHaveStatusCode(200);
    expect(response.body.tags).toHaveLength(TAGS_RESPONSE_LIMIT);
    expect(response.body.tags[0]).toBe('frequent');
  });

  apiTest(
    'filters tags by prefix and excludes v1 templates',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'v2-template',
        attributes: buildRuleTemplateData({
          metadata: { name: 'v2-template', tags: ['production', 'staging'] },
        }),
      });
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'v1-template',
        attributes: buildV1RuleTemplateAttributes({ tags: ['prototype'] }),
      });

      const response = await apiClient.get(getRuleTemplateTagsUrl('pro'), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ tags: ['production'] });
    }
  );

  apiTest('rejects a search longer than the tag limit', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleTemplateTagsUrl('a'.repeat(MAX_TAG_LENGTH + 1)), {
      headers: adminHeaders,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'allows users with read-only rules privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'visible-template',
        attributes: buildRuleTemplateData({
          metadata: { name: 'visible-template', tags: ['visible'] },
        }),
      });
      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_RULES_READ_ROLE);

      const response = await apiClient.get(getRuleTemplateTagsUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('visible');
    }
  );

  apiTest('rejects users without alerting v2 privileges', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(NO_ACCESS_ROLE);

    const response = await apiClient.get(getRuleTemplateTagsUrl(), {
      headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
    });

    expect(response).toHaveStatusCode(403);
  });
});
