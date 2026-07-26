/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import {
  createToolViaKbn,
  deleteAllTools,
} from '../../../scout_agent_builder_shared/lib/tools_kbn';
import { test } from '../fixtures';

test.describe(
  'Agent Builder — tools landing page',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      await deleteAllTools(kbnClient);
      await deleteAllConversationsFromEs(esClient);
    });

    test('renders tools page and table', async ({ page, pageObjects }) => {
      await pageObjects.agentBuilder.navigateToToolsLanding();
      await expect(async () => {
        await expect(page.testSubj.locator('agentBuilderToolsPage')).toBeVisible();
        await expect(page.testSubj.locator('agentBuilderToolsTable')).toBeVisible();
      }).toPass({ timeout: 60_000 });
    });

    test('bulk deletes tools from the table', async ({ page, pageObjects, kbnClient }) => {
      const timestamp = Date.now();
      const ids = [`scout.esql.${timestamp}.a`, `scout.esql.${timestamp}.b`];
      for (const id of ids) {
        await createToolViaKbn(kbnClient, {
          id,
          type: 'esql',
          description: 'bulk delete candidate',
          tags: ['scout'],
          configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
        });
      }

      await pageObjects.agentBuilder.navigateToToolsLanding();
      await expect(page.testSubj.locator('agentBuilderToolsTable')).toBeVisible();

      await pageObjects.agentBuilder.toolsSearch().type(`scout.esql.${timestamp}`);
      await expect(page.testSubj.locator(`agentBuilderToolsTableRow-${ids[0]}`)).toBeVisible({
        timeout: 60_000,
      });

      await pageObjects.agentBuilder.bulkDeleteTools(ids);

      await expect(page.testSubj.locator('agentBuilderToolsTable')).toBeVisible();
      for (const id of ids) {
        await expect(page.testSubj.locator(`agentBuilderToolsTableRow-${id}`)).toHaveCount(0);
      }
    });
  }
);
