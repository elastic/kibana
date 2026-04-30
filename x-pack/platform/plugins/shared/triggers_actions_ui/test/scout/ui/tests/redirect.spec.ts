/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { createIndexThresholdRule } from '../fixtures/generators';
import { getAlertsAndActionsRole } from '../fixtures/roles';

const TRIGGERS_ACTIONS_APP = 'management/insightsAndAlerting/triggersActions';

test.describe('Redirect from triggersActions to rules app', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(getAlertsAndActionsRole());
  });

  test.afterAll(async ({ apiServices }) => {
    for (const id of createdRuleIds) {
      await apiServices.alerting.rules.delete(id).catch(() => {});
    }
    createdRuleIds.length = 0;
  });

  test('redirects to rules app home when navigating to triggersActions with path rules', async ({
    page,
  }) => {
    await page.gotoApp(TRIGGERS_ACTIONS_APP);
    await expect(page).toHaveURL(/app\/rules/);
  });

  test('redirects to rule details page when navigating to triggersActions with path rule/:id', async ({
    apiServices,
    page,
  }) => {
    const rule = await createIndexThresholdRule(apiServices, {
      name: `Scout Redirect Details ${Date.now()}`,
    });
    createdRuleIds.push(rule.id);

    await page.gotoApp(`${TRIGGERS_ACTIONS_APP}/${rule.id}`);
    await expect(page).toHaveURL(new RegExp(`app/rules/${rule.id}`));
  });

  test('redirects to edit rule page when navigating to triggersActions with path edit/:id', async ({
    apiServices,
    page,
  }) => {
    const rule = await createIndexThresholdRule(apiServices, {
      name: `Scout Redirect Edit ${Date.now()}`,
    });
    createdRuleIds.push(rule.id);

    await page.gotoApp(`${TRIGGERS_ACTIONS_APP}/edit/${rule.id}`);
    await expect(page).toHaveURL(new RegExp(`app/rules/edit/${rule.id}`));
  });

  test('redirects to create rule page when navigating to triggersActions with path create/:ruleTypeId', async ({
    page,
  }) => {
    await page.gotoApp(`${TRIGGERS_ACTIONS_APP}/create/observability.rules.custom_threshold`);
    await expect(page).toHaveURL(/app\/rules\/create\/observability\.rules\.custom_threshold/);
  });
});
