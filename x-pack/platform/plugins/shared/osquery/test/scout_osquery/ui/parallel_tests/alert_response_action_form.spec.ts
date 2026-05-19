/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import {
  buildOsqueryAlertTestRule,
  createDetectionRule,
  deleteDetectionRule,
} from '../helpers/detection_rule_lifecycle';
import { getMinimalPack } from '../../api/fixtures/constants';

/**
 * UI-only coverage of the rule-editor pack-response-action flow. The exact
 * payload-shape assertions (outgoing PUT body + persisted GET readback) have
 * moved to `api/tests/response_actions_pack_queries.spec.ts` per the
 * `osquery-scout-ui-post-review-hardening` change (Workstream A). This spec
 * now only asserts observable UI outcomes: the "Rule saved" toast and the
 * combobox value persisting across edit-mode re-entry.
 */

test.describe(
  'Pack-based Osquery response actions in the rule editor',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let ruleId: string;
    let ruleName: string;
    let singleQueryPackId: string;
    let singleQueryPackName: string;
    let multiQueryPackId: string;
    let multiQueryPackName: string;
    const singleQueryKey = 'uptime';
    const multiKeys = ['mem', 'sys', 'opera'] as const;

    test.beforeAll(async ({ kbnClient, apiServices }) => {
      const single = await apiServices.osquery.packs.create(
        getMinimalPack({
          name: `scout-ra-single-${Date.now()}`,
          queries: {
            [singleQueryKey]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        })
      );
      const singleData = (single.data as { data: { saved_object_id: string; name: string } }).data;
      singleQueryPackId = singleData.saved_object_id;
      singleQueryPackName = singleData.name;

      const multi = await apiServices.osquery.packs.create({
        name: `scout-ra-multi-${Date.now()}`,
        enabled: true,
        description: 'scout',
        shards: {},
        queries: {
          mem: {
            ecs_mapping: {},
            interval: 3600,
            platform: 'linux',
            query: 'SELECT * FROM memory_info;',
          },
          sys: {
            ecs_mapping: {},
            interval: 3600,
            platform: 'linux,windows,darwin',
            query: 'SELECT * FROM system_info;',
          },
          opera: {
            ecs_mapping: {},
            interval: 10,
            query: 'select opera_extensions.* from users join opera_extensions using (uid);',
          },
        },
      });
      const multiData = (multi.data as { data: { saved_object_id: string; name: string } }).data;
      multiQueryPackId = multiData.saved_object_id;
      multiQueryPackName = multiData.name;

      const rule = buildOsqueryAlertTestRule({ includeResponseActions: false });
      const created = await createDetectionRule(kbnClient, rule);
      ruleId = created.id;
      ruleName = created.name;
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      await deleteDetectionRule(kbnClient, ruleId);
      await apiServices.osquery.packs.delete(singleQueryPackId);
      await apiServices.osquery.packs.delete(multiQueryPackId);
    });

    test('UI: saves a pack response action and the selection persists across edit-mode re-entry', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      // 5 min: two save round-trips + re-enter edit to verify persisted packs.
      test.setTimeout(300_000);
      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.navigateToRulesList();
      await pageObjects.osqueryRuleEditor.openRuleByName(ruleName);
      await pageObjects.osqueryRuleEditor.enterRuleEditMode();
      await pageObjects.osqueryRuleEditor.goToActionsTab();

      await pageObjects.osqueryRuleEditor.clickAddOsqueryResponseAction();
      await pageObjects.osqueryRuleEditor.chooseRunPackInResponseAction(0);
      await pageObjects.osqueryRuleEditor.selectPackInComboBox(0, singleQueryPackName, [
        singleQueryKey,
      ]);
      await pageObjects.osqueryRuleEditor.clickSaveRule();

      await expect(page.getByText(`${ruleName} was saved`)).toBeVisible({ timeout: 60_000 });
      await pageObjects.osqueryRuleEditor.dismissAllToasts();

      // Re-open edit: combobox shows saved pack (PUT shape covered in API tests).
      await pageObjects.osqueryRuleEditor.enterRuleEditMode();
      await pageObjects.osqueryRuleEditor.goToActionsTab();
      await pageObjects.osqueryRuleEditor
        .responseActionItem(0)
        .getByTestId('comboBoxSearchInput')
        .waitFor({ state: 'visible' });
      await expect(
        pageObjects.osqueryRuleEditor.responseActionItem(0).getByTestId('comboBoxSearchInput')
      ).toHaveValue(singleQueryPackName);

      await pageObjects.osqueryRuleEditor.selectPackInComboBox(0, multiQueryPackName, multiKeys);
      await pageObjects.osqueryRuleEditor.clickSaveChanges();
      await expect(page.getByText(`${ruleName} was saved`)).toBeVisible({ timeout: 60_000 });
      await pageObjects.osqueryRuleEditor.dismissAllToasts();

      await pageObjects.osqueryRuleEditor.enterRuleEditMode();
      await pageObjects.osqueryRuleEditor.goToActionsTab();
      await pageObjects.osqueryRuleEditor
        .responseActionItem(0)
        .getByTestId('comboBoxSearchInput')
        .waitFor({ state: 'visible' });
      await expect(
        pageObjects.osqueryRuleEditor.responseActionItem(0).getByTestId('comboBoxSearchInput')
      ).toHaveValue(multiQueryPackName);
    });
  }
);
