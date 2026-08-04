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
  buildCreateRuleData,
  buildRuleTemplateData,
  buildV1RuleTemplateAttributes,
  getFindRuleTemplatesUrl,
  NO_ACCESS_ROLE,
  RULE_TEMPLATE_PER_PAGE_MAX,
  RULE_TEMPLATE_TAGS_MAX_COUNT,
  testData,
} from '../../../fixtures';

const getTemplateNames = (items: Array<{ rule: { metadata: { name: string } } }>) =>
  items.map((template) => template.rule.metadata.name);

/*
 * Rule templates are installed by Fleet packages, so the specs seed the saved
 * objects directly rather than going through a write API.
 *
 * The authorization tests use custom roles, which are not supported on Elastic
 * Cloud Hosted (unsupported roles silently fall back to `viewer` there), so the
 * suite is restricted to local stateful (classic).
 */
apiTest.describe('Find rule templates API', { tag: '@local-stateful-classic' }, () => {
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
    'should return the installed v2 templates with their create-rule payload',
    async ({ apiClient, apiServices }) => {
      const rule = buildCreateRuleData({
        metadata: {
          name: 'nginx-error-rate',
          description: 'Alerts on the share of 5xx responses',
          tags: ['nginx'],
        },
      });
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'nginx-error-rate',
        attributes: { engine: 'v2', rule },
      });

      const response = await apiClient.get(getFindRuleTemplatesUrl(), { headers: adminHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ total: 1, page: 1, perPage: 20 });
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({ id: 'nginx-error-rate', engine: 'v2', rule });
    }
  );

  apiTest(
    'should exclude templates that do not belong to the v2 engine',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'v2-template',
        attributes: buildRuleTemplateData({ metadata: { name: 'v2-template' } }),
      });
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'legacy-template',
        attributes: buildV1RuleTemplateAttributes({ name: 'legacy-template' }),
      });
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'explicit-v1-template',
        attributes: buildV1RuleTemplateAttributes({
          name: 'explicit-v1-template',
          engine: 'v1',
        }),
      });

      const response = await apiClient.get(getFindRuleTemplatesUrl(), { headers: adminHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(1);
      expect(getTemplateNames(response.body.items)).toStrictEqual(['v2-template']);
    }
  );

  apiTest('search: should match on the template name', async ({ apiClient, apiServices }) => {
    for (const name of ['HighCpuTemplate', 'DiskUsageTemplate']) {
      await apiServices.alertingV2.ruleTemplates.create({
        id: name,
        attributes: buildRuleTemplateData({ metadata: { name } }),
      });
    }

    const response = await apiClient.get(getFindRuleTemplatesUrl({ search: 'HighCpu' }), {
      headers: adminHeaders,
    });

    expect(response).toHaveStatusCode(200);
    expect(getTemplateNames(response.body.items)).toStrictEqual(['HighCpuTemplate']);
  });

  apiTest(
    'search: should match on the template description',
    async ({ apiClient, apiServices }) => {
      const templates = [
        { name: 'memory-template', description: 'Monitors memory pressure on production hosts' },
        { name: 'network-template', description: 'Tracks network latency' },
      ];

      for (const { name, description } of templates) {
        await apiServices.alertingV2.ruleTemplates.create({
          id: name,
          attributes: buildRuleTemplateData({ metadata: { name, description } }),
        });
      }

      const response = await apiClient.get(getFindRuleTemplatesUrl({ search: 'memory' }), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(getTemplateNames(response.body.items)).toStrictEqual(['memory-template']);
    }
  );

  apiTest(
    'search: should return an empty page when nothing matches',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'some-template',
        attributes: buildRuleTemplateData({ metadata: { name: 'some-template' } }),
      });

      const response = await apiClient.get(getFindRuleTemplatesUrl({ search: 'nonexistent' }), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);
    }
  );

  apiTest(
    'tags: should return only templates carrying the tag',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'prod-template',
        attributes: buildRuleTemplateData({
          metadata: { name: 'prod-template', tags: ['production', 'cpu'] },
        }),
      });
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'dev-template',
        attributes: buildRuleTemplateData({
          metadata: { name: 'dev-template', tags: ['development'] },
        }),
      });

      const response = await apiClient.get(getFindRuleTemplatesUrl({ tags: 'production' }), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(getTemplateNames(response.body.items)).toStrictEqual(['prod-template']);
    }
  );

  apiTest(
    'tags: should OR repeated tag parameters together',
    async ({ apiClient, apiServices }) => {
      const templates = [
        { name: 'a-template', tags: ['production'] },
        { name: 'b-template', tags: ['staging'] },
        { name: 'c-template', tags: ['development'] },
      ];

      for (const { name, tags } of templates) {
        await apiServices.alertingV2.ruleTemplates.create({
          id: name,
          attributes: buildRuleTemplateData({ metadata: { name, tags } }),
        });
      }

      const response = await apiClient.get(
        getFindRuleTemplatesUrl({ tags: ['production', 'staging'] }),
        { headers: adminHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect(getTemplateNames(response.body.items)).toStrictEqual(['a-template', 'b-template']);
    }
  );

  apiTest(
    'pagination: should slice results and report the total across pages',
    async ({ apiClient, apiServices }) => {
      for (let i = 0; i < 5; i++) {
        const name = `paginated-template-${i}`;
        await apiServices.alertingV2.ruleTemplates.create({
          id: name,
          attributes: buildRuleTemplateData({ metadata: { name } }),
        });
      }

      await apiTest.step('first page returns the first slice', async () => {
        const response = await apiClient.get(getFindRuleTemplatesUrl({ page: 1, per_page: 2 }), {
          headers: adminHeaders,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ page: 1, perPage: 2, total: 5 });
        expect(getTemplateNames(response.body.items)).toStrictEqual([
          'paginated-template-0',
          'paginated-template-1',
        ]);
      });

      await apiTest.step('last page returns the remaining item', async () => {
        const response = await apiClient.get(getFindRuleTemplatesUrl({ page: 3, per_page: 2 }), {
          headers: adminHeaders,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ page: 3, perPage: 2, total: 5 });
        expect(getTemplateNames(response.body.items)).toStrictEqual(['paginated-template-4']);
      });
    }
  );

  apiTest('sort: should sort by name ascending by default', async ({ apiClient, apiServices }) => {
    for (const name of ['c-template', 'a-template', 'b-template']) {
      await apiServices.alertingV2.ruleTemplates.create({
        id: name,
        attributes: buildRuleTemplateData({ metadata: { name } }),
      });
    }

    const response = await apiClient.get(getFindRuleTemplatesUrl(), { headers: adminHeaders });

    expect(response).toHaveStatusCode(200);
    expect(getTemplateNames(response.body.items)).toStrictEqual([
      'a-template',
      'b-template',
      'c-template',
    ]);
  });

  apiTest('sort: should sort by name descending', async ({ apiClient, apiServices }) => {
    for (const name of ['c-template', 'a-template', 'b-template']) {
      await apiServices.alertingV2.ruleTemplates.create({
        id: name,
        attributes: buildRuleTemplateData({ metadata: { name } }),
      });
    }

    const response = await apiClient.get(
      getFindRuleTemplatesUrl({ sort_field: 'name', sort_order: 'desc' }),
      { headers: adminHeaders }
    );

    expect(response).toHaveStatusCode(200);
    expect(getTemplateNames(response.body.items)).toStrictEqual([
      'c-template',
      'b-template',
      'a-template',
    ]);
  });

  apiTest(
    'should skip a template whose stored payload is no longer valid',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'valid-template',
        attributes: buildRuleTemplateData({ metadata: { name: 'valid-template' } }),
      });
      // The saved object schema treats `rule` as an opaque bag, so content that
      // drifted from the create-rule schema is only caught when the route parses
      // it. The page must still be served.
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'broken-template',
        attributes: { engine: 'v2', rule: { kind: 'alert' } },
      });

      const response = await apiClient.get(getFindRuleTemplatesUrl(), { headers: adminHeaders });

      expect(response).toHaveStatusCode(200);
      expect(getTemplateNames(response.body.items)).toStrictEqual(['valid-template']);
      // `total` reflects what Elasticsearch matched, so it still counts the
      // template that failed to parse.
      expect(response.body.total).toBe(2);
    }
  );

  apiTest('validation: should reject per_page above the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(
      getFindRuleTemplatesUrl({ per_page: RULE_TEMPLATE_PER_PAGE_MAX + 1 }),
      { headers: adminHeaders }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject page values below 1', async ({ apiClient }) => {
    const response = await apiClient.get(getFindRuleTemplatesUrl({ page: 0 }), {
      headers: adminHeaders,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject unknown sort_field values', async ({ apiClient }) => {
    const response = await apiClient.get(getFindRuleTemplatesUrl({ sort_field: 'created_at' }), {
      headers: adminHeaders,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: should reject a search that is empty after trimming',
    async ({ apiClient }) => {
      const response = await apiClient.get(getFindRuleTemplatesUrl({ search: '   ' }), {
        headers: adminHeaders,
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: should reject more tags than the maximum', async ({ apiClient }) => {
    const tags = Array.from({ length: RULE_TEMPLATE_TAGS_MAX_COUNT + 1 }, (_, i) => `tag-${i}`);

    const response = await apiClient.get(getFindRuleTemplatesUrl({ tags }), {
      headers: adminHeaders,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'authorization: should return 200 for a user with read-only rules privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.alertingV2.ruleTemplates.create({
        id: 'visible-to-readers',
        attributes: buildRuleTemplateData({ metadata: { name: 'visible-to-readers' } }),
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_RULES_READ_ROLE);

      const response = await apiClient.get(getFindRuleTemplatesUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(getTemplateNames(response.body.items)).toStrictEqual(['visible-to-readers']);
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

      const response = await apiClient.get(getFindRuleTemplatesUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
