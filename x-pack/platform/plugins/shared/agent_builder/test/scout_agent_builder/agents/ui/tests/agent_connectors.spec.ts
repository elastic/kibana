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
  deleteAgentsByIds,
} from '../../../../scout_agent_builder_shared/lib/agents_kbn';
import { test } from '../fixtures';

const agent = {
  id: 'scout_connectors_test_agent',
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
      await deleteAgentsByIds(kbnClient, [agent.id]);
    });

    test('shows empty state when agent has no connectors', async ({ page, pageObjects }) => {
      await pageObjects.agentBuilder.navigateToAgentConnectors(agent.id);
      await expect(page.testSubj.locator('agentConnectorsCustomizeEmptyState')).toBeVisible();
    });

    test('empty state "Add connector" button opens menu with "From library" and "Create new connector"', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.agentBuilder.navigateToAgentConnectors(agent.id);
      await pageObjects.agentBuilder.clickEmptyStateAddConnector();

      await expect(page.testSubj.locator('agentConnectorsAddFromLibraryMenuItem')).toBeVisible();
      await expect(page.testSubj.locator('agentConnectorsCreateNewMenuItem')).toBeVisible();
    });

    test('"From library" menu item opens the connector library flyout', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.agentBuilder.navigateToAgentConnectors(agent.id);
      await pageObjects.agentBuilder.clickEmptyStateAddConnector();
      await pageObjects.agentBuilder.clickAddConnectorFromLibrary();
      await pageObjects.agentBuilder.waitForConnectorLibraryFlyout();

      await expect(page.testSubj.locator('agentConnectorLibraryFlyout')).toBeVisible();
    });
  }
);
