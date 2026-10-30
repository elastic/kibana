/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const AGENTS_INDEX = '.fleet-agents';
const AGENT_ACTIONS_INDEX = '.fleet-actions';
const ONE_HOUR_MS = 60 * 60 * 1000;

const ENROLLED_HOST = 'scout-uninstall-enrolled';
const PENDING_HOST = 'scout-uninstall-pending';

test.describe('Uninstall agent action', { tag: tags.stateful.classic }, () => {
  let policyId: string;

  const agentDocument = (id: string, hostname: string, uninstallPending: boolean) => {
    const now = new Date().toISOString();
    return {
      id,
      type: 'PERMANENT',
      active: true,
      enrolled_at: now,
      last_checkin: now,
      policy_id: policyId,
      policy_base_id: policyId,
      policy_revision: 1,
      policy_revision_idx: 1,
      namespaces: ['default'],
      uninstall_pending: uninstallPending,
      agent: { id, version: '9.7.0' },
      local_metadata: {
        host: { hostname },
        elastic: { agent: { id, version: '9.7.0', uninstallable: true } },
      },
    };
  };

  test.beforeAll(async ({ apiServices, esClient }) => {
    const response = await apiServices.fleet.agent_policies.create({
      policyName: 'Scout uninstall policy',
      policyNamespace: 'default',
    });
    policyId = response.data.item.id;

    await esClient.index({
      index: AGENTS_INDEX,
      id: 'scout-uninstall-enrolled',
      document: agentDocument('scout-uninstall-enrolled', ENROLLED_HOST, false),
    });
    await esClient.index({
      index: AGENTS_INDEX,
      id: 'scout-uninstall-pending',
      document: agentDocument('scout-uninstall-pending', PENDING_HOST, true),
      refresh: 'wait_for',
    });
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await esClient.deleteByQuery({
      index: AGENTS_INDEX,
      query: { ids: { values: ['scout-uninstall-enrolled', 'scout-uninstall-pending'] } },
      refresh: true,
      ignore_unavailable: true,
    });
    await esClient.deleteByQuery({
      index: AGENT_ACTIONS_INDEX,
      query: { terms: { agents: ['scout-uninstall-enrolled', 'scout-uninstall-pending'] } },
      refresh: true,
      ignore_unavailable: true,
    });
    await apiServices.fleet.agent_policies.delete(policyId);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.fleetHome.navigateTo();
    await pageObjects.fleetHome.waitForPageToLoad();
  });

  test('is disabled with an "Unenroll first" tooltip while the agent is still enrolled', async ({
    page,
    pageObjects,
  }) => {
    const { agentList } = pageObjects;

    await agentList.openRowActions(ENROLLED_HOST);
    await agentList.openSecurityAndRemovalMenu();

    const uninstallItem = agentList.getUninstallActionItem();
    await expect(uninstallItem).toBeVisible();
    await expect(uninstallItem).toBeDisabled();

    await uninstallItem.hover();
    await expect(page.getByText(/Unenroll first/)).toBeVisible();
  });

  test('schedules an uninstall with a validated grace period and cancels it from the activity flyout', async ({
    esClient,
    pageObjects,
  }) => {
    const { agentList } = pageObjects;

    await agentList.openRowActions(PENDING_HOST);
    await agentList.openSecurityAndRemovalMenu();
    await expect(agentList.getUninstallActionItem()).toBeEnabled();
    await agentList.getUninstallActionItem().click();

    await expect(agentList.getUninstallModal()).toBeVisible();
    await expect(agentList.getUninstallDelayInput()).toHaveValue('1');

    // The grace period must be between 1 and 24 hours
    await agentList.getUninstallDelayInput().fill('48');
    await expect(agentList.getModalConfirmButton()).toBeDisabled();
    await agentList.getUninstallDelayInput().fill('0');
    await expect(agentList.getModalConfirmButton()).toBeDisabled();

    const beforeSubmit = Date.now();
    await agentList.getUninstallDelayInput().fill('2');
    await expect(agentList.getModalConfirmButton()).toBeEnabled();
    await agentList.getModalConfirmButton().click();
    await expect(agentList.getUninstallModal()).toBeHidden();

    await expect
      .poll(async () => {
        const res = await esClient.search({
          index: AGENT_ACTIONS_INDEX,
          query: {
            bool: {
              filter: [
                { term: { type: 'UNINSTALL' } },
                { term: { agents: 'scout-uninstall-pending' } },
              ],
            },
          },
        });
        return res.hits.hits.length;
      })
      .toBe(1);

    const res = await esClient.search({
      index: AGENT_ACTIONS_INDEX,
      query: { term: { type: 'UNINSTALL' } },
    });
    const action = res.hits.hits[0]._source as { start_time: string; expiration: string };
    expect(Date.parse(action.start_time)).toBeGreaterThanOrEqual(beforeSubmit + 2 * ONE_HOUR_MS);
    expect(Date.parse(action.expiration)).toBeGreaterThan(Date.parse(action.start_time));

    await agentList.openAgentActivity();
    await expect(agentList.getUninstallPendingTitle()).toBeVisible();

    await agentList.getAbortUninstallButton().click();
    await agentList.getModalConfirmButton().click();

    await expect
      .poll(async () => {
        const cancelRes = await esClient.search({
          index: AGENT_ACTIONS_INDEX,
          query: { term: { type: 'CANCEL' } },
        });
        return cancelRes.hits.hits.length;
      })
      .toBeGreaterThan(0);
  });
});
