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
import { getMinimalPack } from '../../api/fixtures/constants';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Pack-based Osquery response actions in the rule editor', { tag: localTags }, () => {
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

  test('persists pack response actions and expands queries on save', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    await pageObjects.osqueryRuleEditor.navigateToRulesList();
    await pageObjects.osqueryRuleEditor.openRuleByName(ruleName);
    await pageObjects.osqueryRuleEditor.goToActionsTab();

    const savePromise = page.waitForResponse(
      (resp) => resp.url().includes('detection_engine/rules') && resp.request().method() === 'PUT',
      { timeout: 60_000 }
    );

    await pageObjects.osqueryRuleEditor.clickAddOsqueryResponseAction();
    await pageObjects.osqueryRuleEditor.chooseRunPackInResponseAction(0);
    await pageObjects.osqueryRuleEditor.selectPackInComboBox(0, singleQueryPackName);
    await pageObjects.osqueryRuleEditor.clickSaveRule();

    const firstSave = await savePromise;
    expect(firstSave.status()).toBe(200);
    const firstPostData = firstSave.request().postData();
    const firstBody = JSON.parse(firstPostData ?? '{}') as {
      response_actions?: Array<{ params?: { queries?: unknown[] } }>;
    };
    expect(firstBody.response_actions?.[0]?.params?.queries).toStrictEqual([
      {
        interval: 3600,
        query: 'select * from uptime;',
        id: singleQueryKey,
      },
    ]);

    await pageObjects.osqueryRuleEditor.goToActionsTab();
    await pageObjects.osqueryRuleEditor
      .responseActionItem(0)
      .getByTestId('comboBoxSearchInput')
      .waitFor({ state: 'visible' });
    await expect(
      pageObjects.osqueryRuleEditor.responseActionItem(0).getByTestId('comboBoxSearchInput')
    ).toHaveValue(singleQueryPackName);

    const secondSavePromise = page.waitForResponse(
      (resp) => resp.url().includes('detection_engine/rules') && resp.request().method() === 'PUT',
      { timeout: 60_000 }
    );

    await pageObjects.osqueryRuleEditor.selectPackInComboBox(0, multiQueryPackName);
    await pageObjects.osqueryRuleEditor.clickSaveChanges();
    const secondSave = await secondSavePromise;
    expect(secondSave.status()).toBe(200);
    const secondPostData = secondSave.request().postData();
    const secondBody = JSON.parse(secondPostData ?? '{}') as {
      response_actions?: Array<{ params?: { queries?: unknown[] } }>;
    };
    expect(secondBody.response_actions?.[0]?.params?.queries).toStrictEqual([
      {
        interval: 3600,
        query: 'SELECT * FROM memory_info;',
        platform: 'linux',
        id: multiKeys[0],
      },
      {
        interval: 3600,
        query: 'SELECT * FROM system_info;',
        id: multiKeys[1],
      },
      {
        interval: 10,
        query: 'select opera_extensions.* from users join opera_extensions using (uid);',
        id: multiKeys[2],
      },
    ]);
  });
});
