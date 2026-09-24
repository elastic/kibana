/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import { deleteAllTools } from '../../../scout_agent_builder_shared/lib/tools_kbn';
import { test } from '../fixtures';

test.describe(
  'Agent Builder — create tool',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let testIndexName: string;

    test.beforeAll(async ({ esClient }) => {
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
      await deleteAllTools(kbnClient);
      try {
        await esClient.indices.delete({ index: testIndexName });
      } catch {
        // ignore
      }
      await deleteAllConversationsFromEs(esClient);
    });

    test('should create an esql tool', async ({ page, pageObjects }) => {
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

    test('should create an index search tool', async ({ page, pageObjects }) => {
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
  }
);
