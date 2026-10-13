/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createAgentViaKbn,
  deleteAgentViaKbn,
} from '../../../../scout_agent_builder_shared/lib/agents_kbn';
import { test } from '../fixtures';

const agentId = `scout_connectors_test_agent_${Date.now()}`;
const agent = {
  id: agentId,
  name: 'Scout Connectors Test Agent',
  labels: ['scout'],
};

test.describe(
  'Agent Builder — agent connectors page',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await createAgentViaKbn(kbnClient, {
        id: agent.id,
        name: agent.name,
        labels: [...agent.labels],
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await deleteAgentViaKbn(kbnClient, agent.id);
    });

    test('shows empty state when agent has no connectors', async ({ page }) => {
      await page.gotoApp(`agent_builder/agents/${agent.id}/connectors`);
      await expect(page.testSubj.locator('agentConnectorsCustomizeEmptyState')).toBeVisible({
        timeout: 60_000,
      });
    });

    test('empty state "Add connector" button opens menu with both options', async ({ page }) => {
      await page.gotoApp(`agent_builder/agents/${agent.id}/connectors`);
      await page.testSubj
        .locator('agentConnectorsCustomizeEmptyState')
        .waitFor({ state: 'visible', timeout: 60_000 });

      await page.testSubj.click('agentConnectorsCustomizeEmptyStateAddButton');

      await expect(page.testSubj.locator('agentConnectorsAddFromLibraryMenuItem')).toBeVisible();
      await expect(page.testSubj.locator('agentConnectorsCreateNewMenuItem')).toBeVisible();
    });

    test('"From library" menu item opens the connector library flyout', async ({ page }) => {
      await page.gotoApp(`agent_builder/agents/${agent.id}/connectors`);
      await page.testSubj
        .locator('agentConnectorsCustomizeEmptyState')
        .waitFor({ state: 'visible', timeout: 60_000 });

      await page.testSubj.click('agentConnectorsCustomizeEmptyStateAddButton');
      await page.testSubj
        .locator('agentConnectorsAddFromLibraryMenuItem')
        .waitFor({ state: 'visible' });
      await page.testSubj.click('agentConnectorsAddFromLibraryMenuItem');

      await expect(page.testSubj.locator('agentConnectorLibraryFlyout')).toBeVisible({
        timeout: 30_000,
      });
    });

    test('"Create new connector" menu item opens the connector creation flyout', async ({
      page,
    }) => {
      await page.gotoApp(`agent_builder/agents/${agent.id}/connectors`);
      await page.testSubj
        .locator('agentConnectorsCustomizeEmptyState')
        .waitFor({ state: 'visible', timeout: 60_000 });

      await page.testSubj.click('agentConnectorsCustomizeEmptyStateAddButton');
      await page.testSubj.locator('agentConnectorsCreateNewMenuItem').waitFor({ state: 'visible' });
      await page.testSubj.click('agentConnectorsCreateNewMenuItem');

      await expect(page.locator('[data-test-subj="create-connector-flyout"]')).toBeVisible({
        timeout: 30_000,
      });
    });
  }
);
