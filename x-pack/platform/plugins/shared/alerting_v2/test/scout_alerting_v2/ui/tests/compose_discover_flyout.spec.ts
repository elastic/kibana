/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test } from '../fixtures';

const TEST_INDEX = 'test-compose-discover';
const TEST_QUERY = `FROM ${TEST_INDEX} | LIMIT 10`;
const RULE_NAME = 'scout-compose-discover-create';
const EDIT_RULE_NAME = 'scout-compose-discover-edit';
const EDITED_RULE_NAME = 'scout-compose-discover-edited';

test.describe(
  'ComposeDiscoverFlyout — create and edit flows',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ esClient, apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
      await esClient.indices.create(
        {
          index: TEST_INDEX,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              message: { type: 'text' },
            },
          },
        },
        { ignore: [400] }
      );
      await esClient.index({
        index: TEST_INDEX,
        document: { '@timestamp': new Date().toISOString(), message: 'hello' },
        refresh: 'wait_for',
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAlertingV2Editor();
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
      await esClient.indices.delete({ index: TEST_INDEX }, { ignore: [404] });
    });

    test('create flow: open flyout, define query, step through, and submit', async ({
      page,
      pageObjects,
      apiServices,
    }) => {
      await test.step('open ComposeDiscoverFlyout via split button menu', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('sandbox opens automatically in create mode', async () => {
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('type query and apply', async () => {
        await pageObjects.composeDiscover.setSandboxQuery(TEST_QUERY);
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('Next is enabled after query is committed', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
      });

      await test.step('advance to Details step', async () => {
        await pageObjects.composeDiscover.clickNext();
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
      });

      await test.step('fill rule name', async () => {
        await pageObjects.composeDiscover.setRuleName(RULE_NAME);
      });

      await test.step('advance to Notifications step (final)', async () => {
        await pageObjects.composeDiscover.clickNext();
        await expect(pageObjects.composeDiscover.submitButton).toBeVisible();
      });

      await test.step('submit and verify rule created', async () => {
        await pageObjects.composeDiscover.clickSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });

        await expect
          .poll(
            async () => {
              const { items } = await apiServices.alertingV2.rules.find({
                search: RULE_NAME,
              });
              return items.length;
            },
            { timeout: 30_000 }
          )
          .toBeGreaterThan(0);
      });
    });

    test('edit flow: pencil icon opens flyout with pre-populated name, save updates rule', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a rule via API', async () => {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({ metadata: { name: EDIT_RULE_NAME } })
        );
        ruleId = rule.id;
      });

      await test.step('refresh the rules list', async () => {
        await pageObjects.rulesList.goto();
        await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('click pencil icon to open edit flyout', async () => {
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('rule name is pre-populated', async () => {
        // In edit mode, step 0 shows the alert condition with queryCommitted: true.
        // Navigate to Details step to see the name input.
        await pageObjects.composeDiscover.clickNext();
        await expect(pageObjects.composeDiscover.ruleNameInput).toHaveValue(EDIT_RULE_NAME);
      });

      await test.step('modify name and save', async () => {
        await pageObjects.composeDiscover.ruleNameInput.clear();
        await pageObjects.composeDiscover.setRuleName(EDITED_RULE_NAME);
        // Advance to notifications (final step)
        await pageObjects.composeDiscover.clickNext();
        await pageObjects.composeDiscover.clickSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
      });

      await test.step('verify rule updated via API', async () => {
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleId!)).metadata.name, {
            timeout: 30_000,
          })
          .toBe(EDITED_RULE_NAME);
      });
    });

    test('step validation: Next disabled without query, name validation blocks advancement', async ({
      page,
      pageObjects,
    }) => {
      await test.step('open create flyout', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
      });

      await test.step('close sandbox without applying', async () => {
        const sandboxCloseButton = page.locator(
          '[aria-labelledby="composeDiscoverChildTitle"] [aria-label="Close"]'
        );
        await sandboxCloseButton.click();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('Next is disabled with tooltip when no query is committed', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });

      await test.step('open sandbox, type query, and apply', async () => {
        await pageObjects.composeDiscover.openEditorButton.click();
        await pageObjects.composeDiscover.setSandboxQuery(TEST_QUERY);
        await pageObjects.composeDiscover.clickApply();
      });

      await test.step('Next is now enabled; advance to Details step', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
        await pageObjects.composeDiscover.clickNext();
      });

      await test.step('Next does not advance without a name', async () => {
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
        await pageObjects.composeDiscover.clickNext();
        // Still on the Details step — submit button is not visible (not last step yet)
        await expect(pageObjects.composeDiscover.submitButton).toBeHidden();
        await expect(page.testSubj.locator('ruleNameInput')).toBeVisible();
      });
    });

    test('sandbox: Apply commits query, closing without Apply discards changes', async ({
      page,
      pageObjects,
    }) => {
      await test.step('open create flyout (sandbox opens automatically)', async () => {
        await pageObjects.composeDiscover.openCreateFlyout();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('type query and close sandbox without applying', async () => {
        await pageObjects.composeDiscover.setSandboxQuery(TEST_QUERY);
        const sandboxCloseButton = page.locator(
          '[aria-labelledby="composeDiscoverChildTitle"] [aria-label="Close"]'
        );
        await sandboxCloseButton.click();
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
      });

      await test.step('query is not committed — Next stays disabled', async () => {
        await expect(pageObjects.composeDiscover.nextButton).toBeDisabled();
      });

      await test.step('reopen sandbox, type query, and click Apply', async () => {
        await pageObjects.composeDiscover.openEditorButton.click();
        await pageObjects.composeDiscover.setSandboxQuery(TEST_QUERY);
        await pageObjects.composeDiscover.clickApply();
      });

      await test.step('Apply closes sandbox and commits query', async () => {
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeHidden();
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
      });
    });
  }
);
