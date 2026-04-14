/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  createToolViaKbn,
  deleteAllTools,
} from '../../../scout_agent_builder_shared/lib/tools_kbn';
import { test, testData } from '../fixtures';

test.describe(
  'Agent Builder — tools landing page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let llmProxy: LlmProxy;

    test.beforeAll(async ({ log, kbnClient }) => {
      llmProxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, llmProxy);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      llmProxy.close();
      await deleteAllConnectors(kbnClient);
      await deleteAllTools(kbnClient);
      await esClient.deleteByQuery({
        index: testData.CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
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
