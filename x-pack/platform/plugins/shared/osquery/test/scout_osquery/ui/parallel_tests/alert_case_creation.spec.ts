/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import {
  buildOsqueryAlertTestRule,
  createDetectionRule,
  deleteDetectionRule,
} from '../helpers/detection_rule_lifecycle';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Alert flyout Osquery case creation', { tag: localTags }, () => {
  let ruleId: string;
  let ruleName: string;
  let packId: string;
  let packName: string;

  test.beforeAll(async ({ kbnClient, apiServices }) => {
    const pack = await apiServices.osquery.packs.create({
      name: `scout-alert-case-pack-${Date.now()}`,
      enabled: true,
      description: 'scout',
      shards: {},
      queries: {
        q1: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
      },
    });
    packId = (pack.data as { data: { saved_object_id: string; name: string } }).data
      .saved_object_id;
    packName = (pack.data as { data: { saved_object_id: string; name: string } }).data.name;

    const rule = buildOsqueryAlertTestRule({ includeResponseActions: true });
    const created = await createDetectionRule(kbnClient, rule);
    ruleId = created.id;
    ruleName = created.name;
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await deleteDetectionRule(kbnClient, ruleId);
    await apiServices.osquery.packs.delete(packId);
  });

  // Single osquery-from-alert submission covers both add-to-case code paths.
  // The Cypress suite exercised each in its own test, but the osquery results
  // panel allows clicking "Add to Case" multiple times against the same
  // response — so we attach to a pre-seeded existing case first, then to a
  // freshly-created case from the same results. This cuts agent cold-start
  // cost in half without losing either coverage branch.
  test('runs osquery from an alert and attaches results to an existing + a new case', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    // Pack-mode submit + 2× add-to-case can legitimately take 5-6 minutes on
    // a cold stack; budget 7 minutes to stay below default global timeout.
    test.setTimeout(420_000);

    // Seed an existing case via API so the UI only has to exercise the
    // "Select case" variant of the add-to-case modal; the "Create case" path
    // is exercised later in the same test against the same submitted result.
    const existingCaseTitle = `scout-existing-case-${Date.now()}`;
    const existingCase = await apiServices.cases.create({
      title: existingCaseTitle,
      tags: [],
      severity: 'low',
      description: 'scout existing case',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true, extractObservables: true },
      owner: 'securitySolution',
    });
    const existingCaseId = existingCase.data.id;

    try {
      await browserAuth.loginAsAdmin();

      await test.step('submit osquery in pack mode from the alert flyout', async () => {
        await pageObjects.osqueryRuleEditor.openRuleAlertsView(ruleName);
        await pageObjects.osqueryAlertFlyout.expandFirstAlert();
        await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
        await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
        await pageObjects.osqueryAlertFlyout.waitForFlyoutEditorReady();
        await pageObjects.osqueryAlertFlyout.switchFlyoutToPackMode();
        await pageObjects.osqueryAlertFlyout.selectFlyoutPack(packName);
        await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
        // Pack mode renders results inside a tab — `waitForResults` clicks the
        // results tab (if visible) and polls until `osqueryResultsTable` or any
        // data cell appears, handling the pack-vs-single-query UI difference.
        // In pack mode only the data cell may appear (no `osqueryResultsTable`
        // test-subj), so the race inside `waitForResults` is the correct stop
        // condition — do NOT re-wait on `osqueryResultsTable` afterwards.
        await pageObjects.osqueryLiveQueryForm.waitForResults();
      });

      await test.step('attach results to the pre-seeded existing case', async () => {
        await pageObjects.osqueryAlertFlyout.clickAddToCaseFromResults();
        await page.getByText('Select case').waitFor({ state: 'visible', timeout: 30_000 });
        await page.testSubj.locator(`cases-table-row-select-${existingCaseId}`).click();
        await expect(
          page.getByText(new RegExp(`An alert was added to "${existingCaseTitle}"`))
        ).toBeVisible();
      });

      await test.step('attach results to a brand new case via the create-case flyout', async () => {
        await pageObjects.osqueryAlertFlyout.clickAddToCaseFromResults();
        await pageObjects.osqueryCasesPage.openCreateCaseFlyoutFromFilterBar();

        const newCaseTitle = `scout-new-case-${Date.now()}`;
        await pageObjects.osqueryCasesPage.fillNewCaseTitle(newCaseTitle);
        await pageObjects.osqueryCasesPage.fillNewCaseDescription('scout');

        // Scope to the create-case flyout only. The osquery flyout's own
        // `[class*="euiCardSelect"]` gaps are covered by `alert_flyout_take_action.spec.ts`.
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="create-case-flyout"]'],
          exclude: ['[class*="euiCardSelect"]'],
          timeoutMs: 25_000,
        });
        expect(violations).toStrictEqual([]);

        await pageObjects.osqueryCasesPage.submitCreateCase();
        await expect(
          page.getByText(new RegExp(`An alert was added to "${newCaseTitle}"`))
        ).toBeVisible();
      });
    } finally {
      await apiServices.cases.delete([existingCaseId]);
    }
  });
});
