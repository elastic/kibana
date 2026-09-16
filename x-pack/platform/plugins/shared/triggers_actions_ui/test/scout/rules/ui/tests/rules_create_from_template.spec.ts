/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  CLASSIC_RULES_CREATE_URL_RE,
  CLASSIC_RULES_NESTED_RULES_URL_RE,
  MANAGEMENT_ALERTING_V2_URL_RE,
  STANDALONE_RULES_APP_URL_RE,
  makeV1EsQueryRuleTemplateAttributes,
  RULE_TEMPLATE_SO_TYPE,
  test,
} from '../fixtures';

const expectManagementHost = async (page: ScoutPage, pathRe: RegExp) => {
  await expect(page).toHaveURL(pathRe);
  await expect(page).not.toHaveURL(CLASSIC_RULES_NESTED_RULES_URL_RE);
  await expect(page).not.toHaveURL(STANDALONE_RULES_APP_URL_RE);
  await expect(page).not.toHaveURL(MANAGEMENT_ALERTING_V2_URL_RE);
};

const templateId = `scout-v1-template-sm-${Date.now()}`;
const templateName = `Scout v1 template ${templateId}`;

test.describe(
  'Create rule from template',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.create({
        type: RULE_TEMPLATE_SO_TYPE,
        id: templateId,
        overwrite: true,
        attributes: makeV1EsQueryRuleTemplateAttributes(templateName),
      });
    });

    test.afterAll(async ({ kbnClient }) => {
      try {
        await kbnClient.savedObjects.delete({
          type: RULE_TEMPLATE_SO_TYPE,
          id: templateId,
        });
      } catch {
        // beforeAll may have failed before the template was created
      }
    });

    test('stays on the host mount when selecting a template', async ({
      browserAuth,
      kbnUrl,
      page,
      pageObjects,
    }) => {
      const rules = pageObjects.classicRulesPage;

      await browserAuth.loginAsAdmin();
      await rules.goto(kbnUrl);
      await expect(rules.createButton).toBeVisible({ timeout: 30_000 });
      await rules.openCreateRuleTypeModal();
      await rules.selectTemplate(templateId, templateName);

      await expectManagementHost(page, CLASSIC_RULES_CREATE_URL_RE);
      expect(page.url()).toContain(`/create/template/${templateId}`);
    });
  }
);
