/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { deleteAllTools } from '../../../scout_agent_builder_shared/lib/tools_kbn';
import { test, testData } from '../fixtures';

test.describe(
  'Agent Builder — create tool',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let llmProxy: LlmProxy;
    let testIndexName: string;

    test.beforeAll(async ({ log, kbnClient, esClient }) => {
      llmProxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, llmProxy);

      testIndexName = `scout_agent_builder_${Date.now()}`;
      await esClient.indices.create({ index: testIndexName });
      await esClient.index({
        index: testIndexName,
        document: { message: 'hello world', numeric: 1, '@timestamp': new Date().toISOString() },
      });
      await esClient.index({
        index: testIndexName,
        document: { message: 'second doc', numeric: 2, '@timestamp': new Date().toISOString() },
      });
      await esClient.indices.refresh({ index: testIndexName });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      llmProxy.close();
      await deleteAllConnectors(kbnClient);
      await deleteAllTools(kbnClient);
      try {
        await esClient.indices.delete({ index: testIndexName });
      } catch {
        // ignore
      }
      await esClient.deleteByQuery({
        index: testData.CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    test('creates esql and index search tools', async ({ page, pageObjects }) => {
      await test.step('creates an esql tool', async () => {
        const toolId = `scout.esql.${Date.now()}`;
        await pageObjects.agentBuilder.navigateToNewTool();
        await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
        await pageObjects.agentBuilder.setToolId(toolId);
        await expect(page.testSubj.locator('agentBuilderToolTypeSelect')).toBeVisible();
        await pageObjects.agentBuilder.selectToolType(ToolType.esql);
        await pageObjects.agentBuilder.setToolDescription('Scout created ES|QL tool');
        await expect(page.testSubj.locator('agentBuilderEsqlEditor')).toBeVisible();
        await pageObjects.agentBuilder.setEsqlQuery('FROM .kibana | LIMIT 1');
        await pageObjects.agentBuilder.saveTool();
        await pageObjects.agentBuilder.toolsSearch().type(toolId);
        await expect(page.testSubj.locator(`agentBuilderToolsTableRow-${toolId}`)).toBeVisible();
      });

      await test.step('creates an index search tool', async () => {
        const toolId = `scout.index.${Date.now()}`;
        await pageObjects.agentBuilder.navigateToNewTool();
        await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
        await pageObjects.agentBuilder.setToolId(toolId);
        await expect(page.testSubj.locator('agentBuilderToolTypeSelect')).toBeVisible();
        await pageObjects.agentBuilder.selectToolType(ToolType.index_search);
        await expect(page.testSubj.locator('agentBuilderIndexPatternInput')).toBeVisible();
        await pageObjects.agentBuilder.setIndexPattern(testIndexName);
        await pageObjects.agentBuilder.setToolDescription('Scout created Index Search tool');
        await pageObjects.agentBuilder.saveTool();
        await pageObjects.agentBuilder.toolsSearch().type(toolId);
        await expect(page.testSubj.locator(`agentBuilderToolsTableRow-${toolId}`)).toBeVisible();
      });
    });
  }
);
