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
  'Agent Builder — manage tool',
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

    test('edits a tool from the tool details page', async ({ page, pageObjects, kbnClient }) => {
      const toolId = `scout.esql.${Date.now()}`;
      await createToolViaKbn(kbnClient, {
        id: toolId,
        type: 'esql',
        description: 'Scout created tool',
        tags: ['scout'],
        configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
      });

      await pageObjects.agentBuilder.navigateToTool(toolId);
      await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
      await pageObjects.agentBuilder.setToolDescription('Scout updated description');
      await pageObjects.agentBuilder.saveTool();

      await pageObjects.agentBuilder.navigateToTool(toolId);
      await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
      expect(await pageObjects.agentBuilder.getToolIdValue()).toBe(toolId);
      expect(await pageObjects.agentBuilder.getToolDescriptionValue()).toContain(
        'Scout updated description'
      );
    });

    test('clones a tool from the tool details page', async ({ page, pageObjects, kbnClient }) => {
      const toolId = `scout.esql.${Date.now()}`;
      await createToolViaKbn(kbnClient, {
        id: toolId,
        type: 'esql',
        description: 'Scout clone source',
        tags: ['scout'],
        configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
      });

      await pageObjects.agentBuilder.navigateToTool(toolId);
      await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
      await pageObjects.agentBuilder.openToolContextMenu();
      await pageObjects.agentBuilder.clickToolCloneButton();
      await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();

      const clonedToolId = await pageObjects.agentBuilder.getToolIdValue();
      await pageObjects.agentBuilder.saveTool();

      await pageObjects.agentBuilder.navigateToTool(clonedToolId);
      await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
      expect(await pageObjects.agentBuilder.getToolIdValue()).toBe(clonedToolId);
      expect(await pageObjects.agentBuilder.getToolDescriptionValue()).toContain(
        'Scout clone source'
      );
    });

    test('tests a tool from the tool details page', async ({ page, pageObjects, kbnClient }) => {
      const toolId = `scout.esql.${Date.now()}`;
      await createToolViaKbn(kbnClient, {
        id: toolId,
        type: 'esql',
        description: 'Scout testable',
        tags: ['scout'],
        configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
      });

      await pageObjects.agentBuilder.navigateToTool(toolId);
      await pageObjects.agentBuilder.openToolTestFlyout();
      await expect(page.testSubj.locator('agentBuilderToolTestFlyout')).toBeVisible();
      await pageObjects.agentBuilder.submitToolTest();
      await pageObjects.agentBuilder.waitForToolTestResponseNotEmpty();
      const response = await pageObjects.agentBuilder.getToolTestResponse();
      expect(response.trim().length).toBeGreaterThan(0);
    });

    test('deletes a tool from the tool details page', async ({ pageObjects, kbnClient }) => {
      const toolId = `scout.esql.${Date.now()}`;
      await createToolViaKbn(kbnClient, {
        id: toolId,
        type: 'esql',
        description: 'Scout deletable',
        tags: ['scout'],
        configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
      });

      await pageObjects.agentBuilder.navigateToTool(toolId);
      await pageObjects.agentBuilder.openToolContextMenu();
      await pageObjects.agentBuilder.clickToolDeleteButton();
      await pageObjects.agentBuilder.confirmModalConfirm();
      await pageObjects.agentBuilder.navigateToToolsLanding();
      expect(await pageObjects.agentBuilder.isToolInTable(toolId)).toBe(false);
    });

    test('views built-in tool as read-only', async ({ page, pageObjects }) => {
      const builtInToolId = 'platform.core.search';
      await pageObjects.agentBuilder.navigateToTool(builtInToolId);
      await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderToolReadOnlyBadge')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderToolContextMenuButton')).toHaveCount(0);
      await expect(page.testSubj.locator('toolFormSaveButton')).toHaveCount(0);
    });
  }
);
