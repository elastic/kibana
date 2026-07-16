/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const STACK_ALERTS_PATH = '/app/management/insightsAndAlerting/triggersActionsAlerts';
const SOLUTION_FILTER_SUFFIX = ' rule types';

// Mirrors `alerts_and_actions_role` from the FTR config.base.ts.
const ALERTS_AND_ACTIONS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['.alerts-*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: { actions: ['all'], stackAlerts: ['all'] },
      spaces: ['*'],
    },
  ],
};

// Mirrors `only_actions_role` — full connectors access but NO alerting.
const ONLY_ACTIONS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { actions: ['all'] },
      spaces: ['*'],
    },
  ],
};

// Alerts-only access: unlocks the Alerts management link (triggersActionsAlerts)
// but NOT the Rules management link (triggersActions).
const STACK_ALERTS_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['.alerts-*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: { stackAlertsOnly: ['all'] },
      spaces: ['*'],
    },
  ],
};

// data-test-subj values are the management app ids (see management_sidebar_nav).
const ALERTS_MANAGEMENT_LINK_SUBJ = 'triggersActionsAlerts';
const RULES_MANAGEMENT_LINK_SUBJ = 'triggersActions';

// LocalStorage payload that pre-seeds the alerts search bar's filter group.
// In the FTR equivalent the user navigated to `/app/management` first, then
// set the localStorage key, then loaded the alerts page. In Scout we use
// `page.addInitScript` so the value is written before any page script runs.
const PRESAVED_FILTERS_LS_KEY = 'alertsSearchBar.default.filterControls';
const PRESAVED_FILTERS_LS_VALUE =
  '{"initialChildControlState":{"0":{"type":"optionsListControl","order":0,"displaySettings":{"hideExclude":true,"hideSort":true,"placeholder":"","hideActionBar":true,"hideExists":true},"width":"small","grow":true,"dataViewId":"unified-alerts-dv","title":"Status","fieldName":"kibana.alert.status","selectedOptions":["active"],"persist":true},"1":{"type":"optionsListControl","order":1,"displaySettings":{"hideExclude":true,"hideSort":true,"placeholder":"","hideActionBar":true,"hideExists":true},"width":"small","grow":true,"dataViewId":"unified-alerts-dv","title":"Rule","fieldName":"kibana.alert.rule.name"},"2":{"type":"optionsListControl","order":2,"displaySettings":{"hideExclude":true,"hideSort":true,"placeholder":"","hideActionBar":true},"width":"small","grow":true,"dataViewId":"unified-alerts-dv","title":"Group","fieldName":"kibana.alert.group.value"},"3":{"type":"optionsListControl","order":3,"displaySettings":{"hideExclude":true,"hideSort":true,"placeholder":"","hideActionBar":true},"width":"small","grow":true,"dataViewId":"unified-alerts-dv","title":"Tags","fieldName":"tags"}},"autoApplySelections":true,"ignoreParentSettings":{"ignoreValidations":true},"editorConfig":{"hideDataViewSelector":true,"hideAdditionalSettings":true}}';

test.describe('Stack alerts page roles', { tag: tags.stateful.classic }, () => {
  test('alerts_and_actions_role loads the page with the Alerts heading', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTS_AND_ACTIONS_ROLE);
    await page.goto(kbnUrl.get(STACK_ALERTS_PATH));
    await expect(page.testSubj.locator('appTitle')).toHaveText('Alerts');
  });

  test('alerts_and_actions_role loads the page with a pre-saved filters configuration', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTS_AND_ACTIONS_ROLE);
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [PRESAVED_FILTERS_LS_KEY, PRESAVED_FILTERS_LS_VALUE]
    );
    await page.goto(kbnUrl.get(STACK_ALERTS_PATH));

    // The filter group wrapper is a CSS class (no data-test-subj is exposed).
    await expect(page.locator('.filter-group__wrapper')).toBeVisible();
  });

  test('alerts_and_actions_role shows only Stack and Observability solution filters', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTS_AND_ACTIONS_ROLE);
    await page.goto(kbnUrl.get(STACK_ALERTS_PATH));
    await page.testSubj.click('showQueryBarMenu');
    const menu = page.testSubj.locator('queryBarMenuPanel');

    // With this role, the user should only see Stack + Observability rule
    // types (Observability is included because of multi-consumer rules).
    await expect(
      menu.locator(`[data-test-subj="quick-filters-item-Stack${SOLUTION_FILTER_SUFFIX}"]`)
    ).toBeVisible();
    await expect(
      menu.locator(`[data-test-subj="quick-filters-item-Observability${SOLUTION_FILTER_SUFFIX}"]`)
    ).toBeVisible();
    await expect(menu.locator(`[data-test-subj$="${SOLUTION_FILTER_SUFFIX}"]`)).toHaveCount(2);
  });

  test('only_actions_role shows the missing-permission prompt', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(ONLY_ACTIONS_ROLE);
    await page.goto(kbnUrl.get(STACK_ALERTS_PATH));
    await expect(page.testSubj.locator('noPermissionPrompt')).toBeVisible();
  });

  test('stackAlertsOnly role sees the Alerts management link but not the Rules link', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(STACK_ALERTS_ONLY_ROLE);
    await page.goto(kbnUrl.get(STACK_ALERTS_PATH));

    const sidebar = page.locator('.kbnSolutionNav');
    await expect(
      sidebar.locator(`[data-test-subj="${ALERTS_MANAGEMENT_LINK_SUBJ}"]`)
    ).toBeVisible();
    await expect(sidebar.locator(`[data-test-subj="${RULES_MANAGEMENT_LINK_SUBJ}"]`)).toHaveCount(
      0
    );
  });

  test('stackAlerts (rules and alerts) role sees both the Rules and Alerts management links', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTS_AND_ACTIONS_ROLE);
    await page.goto(kbnUrl.get(STACK_ALERTS_PATH));

    const sidebar = page.locator('.kbnSolutionNav');
    await expect(
      sidebar.locator(`[data-test-subj="${ALERTS_MANAGEMENT_LINK_SUBJ}"]`)
    ).toBeVisible();
    await expect(sidebar.locator(`[data-test-subj="${RULES_MANAGEMENT_LINK_SUBJ}"]`)).toBeVisible();
  });
});
