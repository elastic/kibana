/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const API_HEADERS = {
  'kbn-xsrf': 'true',
  'elastic-api-version': testData.OSQUERY_API_VERSION,
};

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe(
  'Osquery response actions form',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleId: string;
    let packId: string;
    let packName: string;
    let agentPolicyId: string;

    test.beforeAll(async ({ kbnClient, apiServices }) => {
      // Install osquery_manager Fleet package so the UI form renders
      // (the form checks /internal/osquery/status for a package policy)
      await kbnClient.request({
        method: 'POST',
        path: '/api/fleet/epm/packages/osquery_manager',
        body: { force: true },
        headers: API_HEADERS,
      });

      const packageResponse = await kbnClient.request({
        method: 'GET',
        path: '/api/fleet/epm/packages/osquery_manager',
        headers: API_HEADERS,
      });
      const osqueryVersion = (packageResponse.data as Record<string, Record<string, string>>).item
        .version;

      const policyName = `osquery-test-policy-${uniqueId()}`;
      const agentPolicyResponse = await apiServices.fleet.agent_policies.create({
        policyName,
        policyNamespace: 'default',
        params: {
          description: 'Agent policy for osquery UI test',
          monitoring_enabled: ['logs', 'metrics'],
        },
      });
      agentPolicyId = agentPolicyResponse.data.item.id;

      await apiServices.fleet.package_policies.create({
        policy_ids: [agentPolicyId],
        package: { name: 'osquery_manager', version: osqueryVersion },
        name: `Policy for ${policyName}`,
        namespace: 'default',
        inputs: { 'osquery_manager-osquery': { enabled: true, streams: {} } },
      });

      packName = `ui-test-pack-${uniqueId()}`;
      const packResponse = await apiServices.osquery.packs.create({
        name: packName,
        description: 'Pack for UI test',
        enabled: true,
        queries: {
          uptimeQuery: { query: 'select * from uptime;', interval: 3600 },
        },
        shards: {},
      });
      packId = (packResponse.data as Record<string, Record<string, string>>).data.saved_object_id;

      const ruleResponse = await kbnClient.request({
        method: 'POST',
        path: '/api/detection_engine/rules',
        body: {
          type: 'query',
          index: ['auditbeat-*'],
          language: 'kuery',
          query: '_id:*',
          name: `UI test rule ${uniqueId()}`,
          description: 'Test rule for response actions UI test',
          risk_score: 21,
          severity: 'low',
          interval: '5m',
          from: 'now-360s',
          to: 'now',
          enabled: false,
        },
        headers: API_HEADERS,
      });
      ruleId = (ruleResponse.data as Record<string, string>).id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      if (ruleId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/detection_engine/rules?id=${ruleId}`,
          headers: API_HEADERS,
          ignoreErrors: [404],
        });
      }

      if (packId) {
        await apiServices.osquery.packs.delete(packId);
      }

      if (agentPolicyId) {
        await apiServices.fleet.agent_policies.delete(agentPolicyId);
      }
    });

    test('user can configure Osquery response actions on a detection rule', async ({
      pageObjects,
      page,
    }) => {
      const { responseActionsForm } = pageObjects;

      await test.step('navigate to response actions form', async () => {
        await responseActionsForm.gotoRuleEdit(ruleId);
        await responseActionsForm.clickActionsTab();
        await expect(
          page.getByText('Response actions are run on each rule execution.')
        ).toBeVisible();
      });

      await test.step('add query action and validate required field error', async () => {
        await responseActionsForm.addOsqueryAction(0);
        await responseActionsForm.triggerQueryValidation(0);
        await expect(responseActionsForm.errorsContainer).toContainText(
          'Query is a required field'
        );

        await responseActionsForm.fillQuery('select * from uptime1', 0);
        await expect(responseActionsForm.errorsContainer).toBeHidden();
      });

      await test.step('validate timeout behavior', async () => {
        await responseActionsForm.expandAdvanced(0);
        await responseActionsForm.clearTimeout(0);
        await expect(
          responseActionsForm
            .getResponseActionItem(0)
            .getByText('The timeout value must be 60 seconds or higher.')
        ).toBeVisible();

        await responseActionsForm.fillTimeout('666', 0);
        await expect(
          responseActionsForm
            .getResponseActionItem(0)
            .getByText('The timeout value must be 60 seconds or higher.')
        ).toBeHidden();
      });

      await test.step('add pack-based action and validate required field', async () => {
        await responseActionsForm.addOsqueryAction(1);
        await responseActionsForm.switchToPackMode(1);
        await expect(responseActionsForm.errorsContainer).toContainText('Pack is a required field');

        await responseActionsForm.selectPack(packName, 1);
        await expect(responseActionsForm.errorsContainer).toBeHidden();
      });

      await test.step('add action with ECS mapping', async () => {
        await responseActionsForm.addOsqueryAction(2);
        await responseActionsForm.fillQuery('select * from uptime', 2);
        // Wait for the OsqueryEditor's useDebounce(500ms) to propagate the value to react-hook-form
        await page.waitForTimeout(600);
        await responseActionsForm.expandAdvanced(2);
        await responseActionsForm.addEcsMapping('label', 'days', 2);
      });

      await test.step('submit and verify success', async () => {
        await responseActionsForm.submitRule();
        await expect(page.getByText('was saved')).toBeVisible({ timeout: 15000 });
      });

      await test.step('verify persistence after re-opening edit form', async () => {
        await responseActionsForm.editRuleLink.click();
        await responseActionsForm.actionsTab.waitFor({ state: 'visible', timeout: 30000 });
        await responseActionsForm.clickActionsTab();

        const item0 = responseActionsForm.getResponseActionItem(0);
        const item2 = responseActionsForm.getResponseActionItem(2);

        await expect(item0).toContainText('select * from uptime1', { timeout: 15000 });
        await expect(item2).toContainText('select * from uptime', { timeout: 15000 });
        await expect(item2).toContainText('Days of uptime', { timeout: 15000 });
      });
    });
  }
);
