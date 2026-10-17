/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  MOCK_RULE_TEMPLATE_LIST,
  MOCK_RULE_TEMPLATES,
  seedMockRuleTemplates,
} from '../../../common/mock_rule_templates';
import { trackCreateRuleRequests } from '../../../common/track_create_rule_requests';
import { buildCreateRuleData, test } from '../fixtures';

const { id: TEMPLATE_ID, attributes: TEMPLATE_ATTRIBUTES } = MOCK_RULE_TEMPLATES.nginxErrorRate;
const TEMPLATE_RULE_NAME = TEMPLATE_ATTRIBUTES.rule.metadata.name;

test.describe(
  'Rule library - install a rule template',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    test.beforeEach(async ({ apiServices, browserAuth }) => {
      await apiServices.alertingV2.ruleTemplates.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
      await seedMockRuleTemplates(apiServices.alertingV2.ruleTemplates);
      await browserAuth.loginAsAlertingV2Editor();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ruleTemplates.cleanUp();
      await apiServices.alertingV2.rules.cleanUp();
    });

    test('lists every installed v2 template', async ({ pageObjects }) => {
      const { ruleLibrary } = pageObjects;

      await ruleLibrary.goto();
      await expect(ruleLibrary.page).toBeVisible();

      for (const { attributes } of MOCK_RULE_TEMPLATE_LIST) {
        await expect(ruleLibrary.templateRow(attributes.rule.metadata.name)).toBeVisible({
          timeout: 60_000,
        });
      }
    });

    test('installing a template creates a disabled rule and the toast opens it', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      const { ruleLibrary, ruleDetails } = pageObjects;
      const { createRequestUrls, installRequestUrls } = trackCreateRuleRequests(page);

      await test.step('open the rule library and find the template', async () => {
        await ruleLibrary.goto();
        await expect(ruleLibrary.page).toBeVisible();
        await ruleLibrary.search(TEMPLATE_RULE_NAME);
        await expect(ruleLibrary.templateRow(TEMPLATE_RULE_NAME)).toBeVisible({ timeout: 60_000 });
      });

      await test.step('install the template', async () => {
        await expect(ruleLibrary.installButton(TEMPLATE_RULE_NAME)).toBeEnabled();
        await ruleLibrary.installButton(TEMPLATE_RULE_NAME).click();
      });

      await test.step('the success toast confirms the rule was created', async () => {
        await expect(ruleLibrary.createdToast(TEMPLATE_RULE_NAME)).toBeVisible({
          timeout: 30_000,
        });
        await expect(ruleLibrary.viewRuleToastLink).toBeVisible();
      });

      let ruleId: string;

      await test.step('the rule exists, is disabled, and records the template', async () => {
        await expect
          .poll(
            async () => {
              const { items } = await apiServices.alertingV2.rules.find({
                search: TEMPLATE_RULE_NAME,
              });
              return items.length;
            },
            { timeout: 30_000 }
          )
          .toBe(1);

        const { items } = await apiServices.alertingV2.rules.find({ search: TEMPLATE_RULE_NAME });
        const [rule] = items;
        ruleId = rule.id;
        expect(rule.enabled).toBe(false);
        expect(rule.metadata.name).toBe(TEMPLATE_RULE_NAME);
        expect(rule.metadata.template).toStrictEqual({ id: TEMPLATE_ID });
      });

      await test.step('the install went through the rule template API exactly once', async () => {
        // Positive control for the create-API assertions on rules authored outside the rule library.
        expect(installRequestUrls).toHaveLength(1);
        expect(installRequestUrls[0]).toContain(`/${TEMPLATE_ID}/_install`);
        expect(createRequestUrls).toHaveLength(0);
      });

      await test.step('view rule opens the installed rule', async () => {
        await ruleLibrary.viewRuleToastLink.click();
        await expect(ruleDetails.page).toBeVisible({ timeout: 30_000 });
        await expect(ruleDetails.heading(TEMPLATE_RULE_NAME)).toBeVisible();
        await expect(ruleDetails.disabledBadge).toBeVisible();
        expect(page.url()).toContain(ruleId!);
      });
    });

    test('the rule count links to the rules created from the template', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      const { ruleLibrary, rulesList } = pageObjects;
      const unrelatedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'scout-rule-not-from-a-template' } })
      );

      await test.step('a template without rules has no count link', async () => {
        await ruleLibrary.goto();
        await ruleLibrary.search(TEMPLATE_RULE_NAME);
        await expect(ruleLibrary.templateRow(TEMPLATE_RULE_NAME)).toBeVisible({ timeout: 60_000 });
        await expect(ruleLibrary.ruleCountLink(TEMPLATE_RULE_NAME)).toBeHidden();
      });

      await test.step('installing the template updates the count', async () => {
        await ruleLibrary.installButton(TEMPLATE_RULE_NAME).click();
        await expect(ruleLibrary.createdToast(TEMPLATE_RULE_NAME)).toBeVisible({
          timeout: 30_000,
        });
        // An external link also carries screen reader text, so match the leading number only.
        await expect(ruleLibrary.ruleCountLink(TEMPLATE_RULE_NAME)).toHaveText(/^1(?!\d)/, {
          timeout: 30_000,
        });
      });

      await test.step('the count opens the rules list filtered to that template', async () => {
        const { items } = await apiServices.alertingV2.rules.find({ search: TEMPLATE_RULE_NAME });
        const [installedRule] = items;

        // The link opens in a new tab, so follow its href in this tab instead.
        const countLink = ruleLibrary.ruleCountLink(TEMPLATE_RULE_NAME);
        await expect(countLink).toHaveAttribute('target', '_blank');
        const href = await countLink.evaluate((link) => (link as HTMLAnchorElement).href);
        await page.goto(href);

        await expect(rulesList.rulesListTable).toBeVisible({ timeout: 30_000 });
        await expect(rulesList.ruleNameLink(installedRule.id)).toBeVisible({ timeout: 30_000 });
        await expect(rulesList.ruleNameLink(unrelatedRule.id)).toBeHidden();
        expect(decodeURIComponent(page.url())).toContain(`template:"${TEMPLATE_ID}"`);
      });
    });
  }
);
