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
import { buildCreateRuleData, test, testData } from '../fixtures';

const { id: TEMPLATE_ID, attributes: TEMPLATE_ATTRIBUTES } = MOCK_RULE_TEMPLATES.nginxErrorRate;
const TEMPLATE_RULE_NAME = TEMPLATE_ATTRIBUTES.rule.metadata.name;
const EDITED_RULE_NAME = `${TEMPLATE_RULE_NAME} (edited)`;

/**
 * Index that matches the nginx template's `FROM logs-nginx.access-*` query.
 * Without it the flyout cannot resolve a time field and blocks Next.
 * Includes a per-run suffix so parallel runs on shared servers do not collide.
 */
const NGINX_TEST_INDEX = `logs-nginx.access-scout-${Date.now()}`;

test.describe('Rule library - install a rule template', { tag: testData.UI_TAG }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create(
      {
        index: NGINX_TEST_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'http.response.status_code': { type: 'integer' },
            'host.name': { type: 'keyword' },
          },
        },
      },
      { ignore: [400] }
    );
    await esClient.index({
      index: NGINX_TEST_INDEX,
      document: {
        '@timestamp': new Date().toISOString(),
        'http.response.status_code': 200,
        'host.name': 'scout-host',
      },
      refresh: 'wait_for',
    });
  });

  test.beforeEach(async ({ apiServices, browserAuth }) => {
    await apiServices.alertingV2.ruleTemplates.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await seedMockRuleTemplates(apiServices.alertingV2.ruleTemplates);
    await browserAuth.loginAsAlertingEditor();
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await apiServices.alertingV2.ruleTemplates.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await esClient.indices.delete({ index: NGINX_TEST_INDEX }, { ignore: [404] });
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

  test('creating from a template opens the flyout and creates a rule', async ({
    apiServices,
    page,
    pageObjects,
  }) => {
    const { ruleLibrary, ruleDetails, composeDiscover } = pageObjects;
    const { createRequestUrls, installRequestUrls } = trackCreateRuleRequests(page);

    await test.step('open the rule library and find the template', async () => {
      await ruleLibrary.goto();
      await expect(ruleLibrary.page).toBeVisible();
      await ruleLibrary.search(TEMPLATE_RULE_NAME);
      await expect(ruleLibrary.templateRow(TEMPLATE_RULE_NAME)).toBeVisible({ timeout: 60_000 });
    });

    await test.step('open the create flyout from the template', async () => {
      await expect(ruleLibrary.createButton(TEMPLATE_RULE_NAME)).toBeEnabled();
      await ruleLibrary.createButton(TEMPLATE_RULE_NAME).click();
      await expect(composeDiscover.flyout).toBeVisible({ timeout: 30_000 });
    });

    await test.step('through the flyout, edit the rule name, and submit', async () => {
      // Template pre-fills all fields; advance through each step.
      await expect(composeDiscover.nextButton).toBeEnabled({ timeout: 30_000 });
      await composeDiscover.clickNext(); // Alert condition → Outcome
      await composeDiscover.clickNext(); // Outcome → Details

      // Edit the pre-populated rule name to verify the form values are persisted.
      await composeDiscover.setRuleName(EDITED_RULE_NAME);

      await composeDiscover.clickNext(); // Details → Actions (validates name)
      await composeDiscover.clickSubmit(); // Create rule
    });

    await test.step('the success toast confirms the rule was created with the edited name', async () => {
      await expect(ruleLibrary.createdToast(EDITED_RULE_NAME)).toBeVisible({
        timeout: 30_000,
      });
      await expect(ruleLibrary.viewRuleToastLink).toBeVisible();
    });

    let ruleId: string;

    await test.step('the rule exists with the edited name', async () => {
      await expect
        .poll(
          async () => {
            const { items } = await apiServices.alertingV2.rules.find({
              search: EDITED_RULE_NAME,
            });
            return items.length;
          },
          { timeout: 30_000 }
        )
        .toBe(1);

      const { items } = await apiServices.alertingV2.rules.find({ search: EDITED_RULE_NAME });
      const [rule] = items;
      ruleId = rule.id;
      expect(rule.enabled).toBe(true);
      expect(rule.metadata.name).toBe(EDITED_RULE_NAME);
    });

    await test.step('the install went through the rule template API exactly once', async () => {
      expect(installRequestUrls).toHaveLength(1);
      expect(installRequestUrls[0]).toContain(`/${TEMPLATE_ID}/_install`);
      expect(createRequestUrls).toHaveLength(0);
    });

    await test.step('view rule opens the created rule with the edited name', async () => {
      await ruleLibrary.viewRuleToastLink.click();
      await expect(ruleDetails.page).toBeVisible({ timeout: 30_000 });
      await expect(ruleDetails.heading(EDITED_RULE_NAME)).toBeVisible();
      await expect(ruleDetails.enabledBadge).toBeVisible();
      expect(page.url()).toContain(ruleId!);
    });
  });

  test('the rule count links to the rules created from the template', async ({
    apiServices,
    page,
    pageObjects,
  }) => {
    const { ruleLibrary, rulesList, composeDiscover } = pageObjects;
    const unrelatedRule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'scout-rule-not-from-a-template' } })
    );

    await test.step('a template without rules has no count link', async () => {
      await ruleLibrary.goto();
      await ruleLibrary.search(TEMPLATE_RULE_NAME);
      await expect(ruleLibrary.templateRow(TEMPLATE_RULE_NAME)).toBeVisible({ timeout: 60_000 });
      await expect(ruleLibrary.ruleCountLink(TEMPLATE_RULE_NAME)).toBeHidden();
    });

    await test.step('creating a rule from the template updates the count', async () => {
      await ruleLibrary.createButton(TEMPLATE_RULE_NAME).click();
      await expect(composeDiscover.flyout).toBeVisible({ timeout: 30_000 });
      await expect(composeDiscover.nextButton).toBeEnabled({ timeout: 30_000 });
      await composeDiscover.clickNext(); // Alert condition → Outcome
      await composeDiscover.clickNext(); // Outcome → Details
      await composeDiscover.clickNext(); // Details → Actions
      await composeDiscover.clickSubmit();
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
});
