/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createMcpConnectorViaKbn } from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import {
  createTestMcpServer,
  type McpServerSimulator,
} from '../../../scout_agent_builder_shared/lib/mcp_server_simulator';
import {
  createToolViaKbn,
  deleteAllTools,
} from '../../../scout_agent_builder_shared/lib/tools_kbn';
import { test } from '../fixtures';

test.describe(
  'Agent Builder — MCP tools',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let mcpServer: McpServerSimulator;
    let mcpServerUrl: string;
    let connectorId: string;

    test.beforeAll(async ({ kbnClient }) => {
      await deleteAllTools(kbnClient);

      mcpServer = createTestMcpServer();
      mcpServerUrl = await mcpServer.start();
      const connector = await createMcpConnectorViaKbn(kbnClient, mcpServerUrl);
      connectorId = connector.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      await deleteAllTools(kbnClient);
      try {
        await mcpServer.stop();
      } catch {
        // ignore
      }
      await deleteAllConversationsFromEs(esClient);
    });

    test('MCP tool flows', async ({ page, pageObjects, kbnClient }) => {
      test.setTimeout(180_000);

      await test.step('creates an MCP tool by selecting connector and tool', async () => {
        const toolId = `scout.mcp.${Date.now()}`;
        await pageObjects.agentBuilder.navigateToNewTool();
        await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
        await expect(page.testSubj.locator('agentBuilderToolTypeSelect')).toBeVisible();
        await pageObjects.agentBuilder.selectToolType(ToolType.mcp);
        await expect(page.testSubj.locator('agentBuilderMcpConnectorSelect')).toBeVisible();
        await pageObjects.agentBuilder.selectMcpConnector(connectorId);
        await pageObjects.agentBuilder.waitForMcpToolsToLoad();
        await expect(page.testSubj.locator('agentBuilderMcpToolSelect')).toBeVisible();
        await pageObjects.agentBuilder.selectMcpTool('echo');
        await pageObjects.agentBuilder.setToolId(toolId);
        await pageObjects.agentBuilder.saveTool();
        await pageObjects.agentBuilder.navigateToToolsLanding();
        expect(await pageObjects.agentBuilder.isToolInTable(toolId)).toBe(true);
      });

      await test.step('edits an MCP tool description', async () => {
        const toolId = `scout.mcp.edit.${Date.now()}`;
        const newDescription = 'Updated MCP tool description';
        await createToolViaKbn(kbnClient, {
          id: toolId,
          type: 'mcp',
          description: 'Original description',
          tags: [],
          configuration: {
            connector_id: connectorId,
            tool_name: 'echo',
          },
        });

        await pageObjects.agentBuilder.navigateToTool(toolId);
        await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
        await pageObjects.agentBuilder.setToolDescription(newDescription);
        await pageObjects.agentBuilder.saveTool();

        await pageObjects.agentBuilder.navigateToTool(toolId);
        expect(await pageObjects.agentBuilder.getToolDescriptionValue()).toContain(newDescription);
      });

      await test.step('clones an MCP tool and selects a different server tool', async () => {
        const sourceToolId = `scout.mcp.clone.source.${Date.now()}`;
        const clonedToolId = `scout.mcp.clone.copy.${Date.now()}`;

        await createToolViaKbn(kbnClient, {
          id: sourceToolId,
          type: 'mcp',
          description: 'Tool to be cloned',
          tags: [],
          configuration: {
            connector_id: connectorId,
            tool_name: 'add',
          },
        });

        await pageObjects.agentBuilder.navigateToTool(sourceToolId);
        await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
        await pageObjects.agentBuilder.openToolContextMenu();
        await pageObjects.agentBuilder.clickToolCloneButton();
        await pageObjects.agentBuilder.waitForMcpToolsToLoad();
        await pageObjects.agentBuilder.selectMcpTool('echo');
        await pageObjects.agentBuilder.setToolId(clonedToolId);
        await pageObjects.agentBuilder.saveTool();

        await pageObjects.agentBuilder.navigateToToolsLanding();
        expect(await pageObjects.agentBuilder.isToolInTable(sourceToolId)).toBe(true);
        expect(await pageObjects.agentBuilder.isToolInTable(clonedToolId)).toBe(true);
      });

      await test.step('deletes an MCP tool', async () => {
        const toolId = `scout.mcp.delete.${Date.now()}`;
        await createToolViaKbn(kbnClient, {
          id: toolId,
          type: 'mcp',
          description: 'Tool to be deleted',
          tags: [],
          configuration: {
            connector_id: connectorId,
            tool_name: 'echo',
          },
        });

        await pageObjects.agentBuilder.navigateToTool(toolId);
        await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
        await pageObjects.agentBuilder.openToolContextMenu();
        await pageObjects.agentBuilder.clickToolDeleteButton();
        await pageObjects.agentBuilder.confirmModalConfirm();

        await expect(page.testSubj.locator('agentBuilderToolsPage')).toBeVisible({
          timeout: 60_000,
        });
        await expect(async () => {
          expect(await pageObjects.agentBuilder.isToolInTable(toolId)).toBe(false);
        }).toPass({ timeout: 30_000 });
      });

      await test.step('executes the add tool and receives correct result', async () => {
        const toolId = `scout.mcp.execute.${Date.now()}`;
        await createToolViaKbn(kbnClient, {
          id: toolId,
          type: 'mcp',
          description: 'Tool for execution test',
          tags: [],
          configuration: {
            connector_id: connectorId,
            tool_name: 'add',
          },
        });

        await pageObjects.agentBuilder.navigateToTool(toolId);
        await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
        await pageObjects.agentBuilder.openToolTestFlyout();
        await expect(page.testSubj.locator('agentBuilderToolTestFlyout')).toBeVisible();
        await pageObjects.agentBuilder.setToolTestInput('a', 5);
        await pageObjects.agentBuilder.setToolTestInput('b', 3);
        await pageObjects.agentBuilder.submitToolTest();
        await pageObjects.agentBuilder.waitForToolTestResponseNotEmpty();
        const response = await pageObjects.agentBuilder.getToolTestResponse();
        expect(response).toContain('8');
      });

      await test.step('bulk imports MCP tools via the UI', async () => {
        const namespace = `scout.mcp.bulk.${Date.now()}`;
        await pageObjects.agentBuilder.navigateToToolsLanding();
        await pageObjects.agentBuilder.openManageMcpMenu();
        await pageObjects.agentBuilder.clickBulkImportMcpMenuItem();
        await expect(page.testSubj.locator('agentBuilderBulkImportMcpToolsPage')).toBeVisible();
        await pageObjects.agentBuilder.selectBulkImportConnector(connectorId);
        await pageObjects.agentBuilder.waitForBulkImportToolsToLoad();
        await pageObjects.agentBuilder.selectBulkImportToolCheckbox('subtract');
        await pageObjects.agentBuilder.selectBulkImportToolCheckbox('multiply');
        await pageObjects.agentBuilder.setBulkImportNamespace(namespace);
        await pageObjects.agentBuilder.clickBulkImportSubmit();
        await expect(page.testSubj.locator('agentBuilderToolsTable')).toBeVisible();
        expect(await pageObjects.agentBuilder.isToolInTable(`${namespace}.subtract`)).toBe(true);
        expect(await pageObjects.agentBuilder.isToolInTable(`${namespace}.multiply`)).toBe(true);
      });

      await test.step('shows error banner when MCP server is unavailable during tool creation', async () => {
        await mcpServer.stop();
        try {
          const errorTestConnector = await createMcpConnectorViaKbn(kbnClient, mcpServerUrl, {
            name: 'scout-error-test-connector',
          });

          await pageObjects.agentBuilder.navigateToToolsLanding();
          await pageObjects.agentBuilder.navigateToNewTool();
          await expect(page.testSubj.locator('agentBuilderToolFormPage')).toBeVisible();
          await pageObjects.agentBuilder.selectToolType(ToolType.mcp);
          await pageObjects.agentBuilder.selectMcpConnector(errorTestConnector.id);
          await expect(
            page.testSubj.locator('agentBuilderMcpHealthBanner-list_tools_failed')
          ).toBeVisible();
        } finally {
          await mcpServer.start();
        }
      });
    });
  }
);
