/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import {
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildRuleTemplateData,
  buildV1RuleTemplateAttributes,
  getRuleTemplateTagsUrl,
  NO_ACCESS_ROLE,
  RULE_TEMPLATE_TAG_MAX_LENGTH,
  testData,
} from '../../../fixtures';

/*
 * See `find_rule_templates.spec.ts` for why the suite is restricted to local
 * stateful (classic).
 */
apiTest.describe('Rule template tags API', { tag: '@local-stateful-classic' }, () => {
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
    'should return the unique tags across templates, sorted and deduplicated',
    async ({ apiClient, apiServices }) => {
      const templates = [
        { name: 'nginx-template', tags: ['nginx', 'observability'] },
        { name: 'postgres-template', tags: ['postgresql', 'observability'] },
      ];

      for (const { name, tags } of templates) {
        await apiServices.alertingV2.ruleTemplates.create({
          id: name,
          attributes: buildRuleTemplateData({ metadata: { name, tags } }),
        });
      }

      const response = await apiClient.get(getRuleTemplateTagsUrl(), { headers: adminHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(['nginx', 'observability', 'postgresql']);
    }
  );

  apiTest(
    'should ignore tags from templates that do not belong to the v2 engine',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'v2-template',
        attributes: buildRuleTemplateData({
          metadata: { name: 'v2-template', tags: ['observability'] },
        }),
      });
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'legacy-template',
        attributes: buildV1RuleTemplateAttributes({
          name: 'legacy-template',
          tags: ['legacy-only'],
        }),
      });

      const response = await apiClient.get(getRuleTemplateTagsUrl(), { headers: adminHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(['observability']);
    }
  );

  apiTest('should narrow the tags to the search prefix', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.ruleTemplates.create({
      id: 'tagged-template',
      attributes: buildRuleTemplateData({
        metadata: { name: 'tagged-template', tags: ['production', 'product-analytics', 'staging'] },
      }),
    });

    await apiTest.step('prefix matches every tag starting with it', async () => {
      const response = await apiClient.get(getRuleTemplateTagsUrl({ search: 'produc' }), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(['product-analytics', 'production']);
    });

    await apiTest.step('prefix does not match mid-tag substrings', async () => {
      const response = await apiClient.get(getRuleTemplateTagsUrl({ search: 'duction' }), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual([]);
    });
  });

  apiTest(
    'should treat regex metacharacters in the search as literal text',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'dotted-template',
        attributes: buildRuleTemplateData({
          metadata: { name: 'dotted-template', tags: ['team.sre', 'teamXsre'] },
        }),
      });

      const response = await apiClient.get(getRuleTemplateTagsUrl({ search: 'team.' }), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(['team.sre']);
    }
  );

  apiTest('should return an empty list when no templates exist', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleTemplateTagsUrl(), { headers: adminHeaders });

    expect(response).toHaveStatusCode(200);
    expect(response.body.tags).toStrictEqual([]);
  });

  apiTest('validation: should reject an empty search', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleTemplateTagsUrl({ search: '   ' }), {
      headers: adminHeaders,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject a search longer than the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(
      getRuleTemplateTagsUrl({ search: 'a'.repeat(RULE_TEMPLATE_TAG_MAX_LENGTH + 1) }),
      { headers: adminHeaders }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'authorization: should return 200 for a user with read-only rules privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'visible-to-readers',
        attributes: buildRuleTemplateData({
          metadata: { name: 'visible-to-readers', tags: ['observability'] },
        }),
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_RULES_READ_ROLE);

      const response = await apiClient.get(getRuleTemplateTagsUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(['observability']);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_ACCESS_ROLE);

      const response = await apiClient.get(getRuleTemplateTagsUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
