/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  buildAlertEvent,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  buildWorkflowYaml,
  READ_ROLE,
  test,
  testData,
} from '../fixtures';

const { POLL_TIMEOUT_MS } = testData;

/*
 * Viewer plus `workflowsManagement: read`. Opening action-policy details
 * fetches the workflow destination; READ_ROLE alone surfaces a
 * "Failed to load workflow" toast.
 */
const SMOKE_VIEWER_ROLE: KibanaRole = {
  elasticsearch: READ_ROLE.elasticsearch,
  kibana: READ_ROLE.kibana.map((entry) => ({
    ...entry,
    feature: {
      ...entry.feature,
      workflowsManagement: ['read'],
    },
  })),
};

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 *
 * Setup mirrors `list_execution_history_rule_lookup.spec.ts`: a rule-scoped
 * action policy plus a disabled rule, then a seeded alert event that the
 * dispatcher turns into a fire action and an execution-history event.
 */
test.describe('Execution history — smoke', { tag: '@local-stateful-classic' }, () => {
  let policyId: string;
  let policyName: string;
  let ruleId: string;
  let ruleName: string;
  let workflowId: string;

  test.beforeAll(async ({ apiServices }) => {
    const runId = Date.now();
    policyId = `eh-ui-smoke-policy-${runId}`;
    policyName = `EH UI Smoke Policy ${runId}`;
    ruleId = `eh-ui-smoke-rule-${runId}`;
    ruleName = `EH UI Smoke Rule ${runId}`;

    const workflow = await apiServices.alertingV2.workflows.create(
      buildWorkflowYaml(`eh-ui-smoke-workflow-${runId}`)
    );
    workflowId = workflow.id;

    await apiServices.alertingV2.actionPolicies.upsert(
      policyId,
      buildCreateActionPolicyData({
        name: policyName,
        description: 'Scout execution history UI smoke policy',
        destinations: [{ type: 'workflow', id: workflowId }],
      })
    );

    await apiServices.alertingV2.rules.upsert(
      ruleId,
      buildCreateRuleData({
        metadata: { name: ruleName },
        schedule: { every: '1d' },
        query: {
          format: 'standalone',
          breach: { query: 'FROM .alert-actions | WHERE rule_id == "__never_matches__"' },
        },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );
    await apiServices.alertingV2.rules.bulkDisable({ ids: [ruleId] });

    await apiServices.alertingV2.ruleEvents.seed([
      buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: `${ruleId}-series`,
        alert: { id: `${ruleId}-episode`, status: 'active' },
        status: 'breached',
        source: 'internal',
        '@timestamp': new Date().toISOString(),
      }),
    ]);

    await apiServices.alertingV2.alertActionsEvents.waitForAtLeast(1, {
      ruleId,
      actionTypes: ['fire'],
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(SMOKE_VIEWER_ROLE);
  });

  test.afterAll(async ({ apiServices }) => {
    if (ruleId) {
      await apiServices.alertingV2.alertActionsEvents.cleanUp({ ruleId });
      await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId });
      await apiServices.alertingV2.rules.delete(ruleId);
    }
    if (policyId) {
      await apiServices.alertingV2.actionPolicies.delete(policyId);
    }
    if (workflowId) {
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
    }
  });

  test('shows action policy executions on the Action policies tab', async ({
    page,
    pageObjects,
  }) => {
    const { executionHistory } = pageObjects;
    await executionHistory.goto();

    await test.step('URL is the execution_history app path', async () => {
      expect(page.url()).toContain('/app/management/alertingV2/execution_history');
    });

    await test.step('page header and tabs are visible', async () => {
      await expect(pageObjects.alertingNavigation.pageHeading('executionHistory')).toBeVisible();
      await expect(executionHistory.rulesTab).toBeVisible();
      await expect(executionHistory.actionPoliciesTab).toBeVisible();
    });

    await test.step('Action policies tab lists the dispatched execution', async () => {
      await executionHistory.openActionPoliciesTab();
      await executionHistory.search(policyName);

      const row = executionHistory.policyRow(policyName);
      await expect(row).toBeVisible({ timeout: POLL_TIMEOUT_MS });
      await expect(row).toContainText('Dispatched');
      await expect(row).toContainText(ruleName);
    });

    await test.step('policy name opens the details flyout', async () => {
      await executionHistory.openPolicyDetails(policyName);
      await expect(executionHistory.policyDetailsFlyout).toBeVisible();
      await expect(
        executionHistory.policyDetailsFlyout.getByRole('heading', { name: policyName })
      ).toBeVisible();
      await expect(page.getByText('Failed to load workflow')).toHaveCount(0);
    });
  });
});
