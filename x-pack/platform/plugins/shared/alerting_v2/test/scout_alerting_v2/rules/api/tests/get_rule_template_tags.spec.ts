/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/api';
import { MAX_TAG_LENGTH, TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import {
  RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  DEPLOYMENTS_WITH_ALERTING_V2,
} from '../../../common/constants';
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

apiTest.describe('Get rule template tags API', { tag: DEPLOYMENTS_WITH_ALERTING_V2 }, () => {
  let adminHeaders: Record<string, string>;
  const createdTemplateIds = new Set<string>();
  const templateNamespace = `rule-template-tags-${randomUUID()}`;
  const templateId = (suffix: string) => `${templateNamespace}-${suffix}`;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...cookieHeader, ...testData.COMMON_HEADERS };
  });

  apiTest.beforeEach(() => {
    createdTemplateIds.clear();
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await Promise.all(
      [...createdTemplateIds].map((id) =>
        kbnClient.savedObjects.delete({ type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id })
      )
    );
  });

  apiTest(
    'returns tags from all v2 templates independently of list pagination',
    async ({ apiClient, apiServices }) => {
      const firstTemplateId = templateId('a-template');
      const secondTemplateId = templateId('b-template');
      for (const { id, templateTags } of [
        { id: firstTemplateId, templateTags: ['first-page'] },
        { id: secondTemplateId, templateTags: ['second-page'] },
      ]) {
        createdTemplateIds.add(id);
        await apiServices.alertingV2.ruleTemplates.create({
          id,
          attributes: buildRuleTemplateData({ metadata: { name: id, tags: templateTags } }),
        });
      }

      const firstPage = await apiClient.get(
        getFindRuleTemplatesUrl({ search: templateNamespace, page: 1, per_page: 1 }),
        { headers: adminHeaders }
      );
      const response = await apiClient.get(getRuleTemplateTagsUrl(), { headers: adminHeaders });

      expect(firstPage).toHaveStatusCode(200);
      expect(firstPage.body.total).toBe(2);
      expect(firstPage.body.items).toHaveLength(1);
      expect(firstPage.body.items[0].id).toBe(firstTemplateId);
      expect(firstPage.body.items[0].rule.metadata.tags).toStrictEqual(['first-page']);
      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(
        expect.arrayContaining(['first-page', 'second-page'])
      );
    }
  );

  apiTest('returns at most 20 tags ordered by usage', async ({ apiClient, apiServices }) => {
    for (let i = 0; i < TAGS_RESPONSE_LIMIT + 1; i++) {
      const id = templateId(`template-${i}`);
      createdTemplateIds.add(id);
      await apiServices.alertingV2.ruleTemplates.create({
        id,
        attributes: buildRuleTemplateData({
          metadata: { name: id, tags: [`tag-${i}`, ...(i < 2 ? ['frequent'] : [])] },
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
      const v2TemplateId = templateId('v2-template');
      createdTemplateIds.add(v2TemplateId);
      await apiServices.alertingV2.ruleTemplates.create({
        id: v2TemplateId,
        attributes: buildRuleTemplateData({
          metadata: { name: v2TemplateId, tags: ['production', 'staging'] },
        }),
      });
      const v1TemplateId = templateId('v1-template');
      createdTemplateIds.add(v1TemplateId);
      await apiServices.alertingV2.ruleTemplates.create({
        id: v1TemplateId,
        attributes: buildV1RuleTemplateAttributes({ name: v1TemplateId, tags: ['prototype'] }),
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
      const visibleTemplateId = templateId('visible-template');
      createdTemplateIds.add(visibleTemplateId);
      await apiServices.alertingV2.ruleTemplates.create({
        id: visibleTemplateId,
        attributes: buildRuleTemplateData({
          metadata: { name: visibleTemplateId, tags: ['visible'] },
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
