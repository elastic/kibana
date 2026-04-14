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
  createAgentViaKbn,
  deleteAllAgentsFromEs,
} from '../../../scout_agent_builder_shared/lib/agents_kbn';
import {
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { test, testData } from '../fixtures';

const agents = [
  { id: 'test_agent_1', name: 'Test Agent 1', labels: ['first'] as const },
  { id: 'test_agent_2', name: 'Test Agent 2', labels: ['second'] as const },
] as const;

test.describe(
  'Agent Builder — agents list',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let llmProxy: LlmProxy;

    test.beforeAll(async ({ log, kbnClient, esClient }) => {
      llmProxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, llmProxy);
      await deleteAllAgentsFromEs(esClient, testData.CHAT_AGENTS_INDEX);
      for (const agent of agents) {
        await createAgentViaKbn(kbnClient, {
          id: agent.id,
          name: agent.name,
          labels: [...agent.labels],
        });
      }
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      llmProxy.close();
      await deleteAllConnectors(kbnClient);
      await deleteAllAgentsFromEs(esClient, testData.CHAT_AGENTS_INDEX);
      await esClient.deleteByQuery({
        index: testData.CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    test('agents list journeys', async ({ page, pageObjects }) => {
      await test.step('renders', async () => {
        await pageObjects.agentBuilder.navigateToApp('manage/agents');
        await expect(page.testSubj.locator('agentBuilderAgentsListPageTitle')).toContainText(
          'Agents'
        );
        await expect(page.testSubj.locator('agentBuilderNewAgentButton')).toBeVisible();
        await expect(page.testSubj.locator('agentBuilderAgentsListTable')).toBeVisible();
      });

      await test.step('lists created agents', async () => {
        expect(await pageObjects.agentBuilder.countAgentsListRows()).toBeGreaterThan(2);
        for (const agent of agents) {
          await pageObjects.agentBuilder.agentExistsOrFail(agent.id);
        }
      });

      await test.step('filters on search', async () => {
        const search = pageObjects.agentBuilder.agentsListSearch();
        await search.type(agents[0].name);
        expect(await pageObjects.agentBuilder.countAgentsListRows()).toBe(1);
        await pageObjects.agentBuilder.agentExistsOrFail(agents[0].id);
        await search.clear();
        expect(await search.getValue()).toBe('');
      });

      await test.step('filters on labels', async () => {
        await pageObjects.agentBuilder.selectAgentLabel(agents[0].labels[0]);
        await pageObjects.agentBuilder.dismissWithEscape();
        expect(await pageObjects.agentBuilder.countAgentsListRows()).toBe(1);
        await pageObjects.agentBuilder.agentExistsOrFail(agents[0].id);
      });

      await test.step('chats with agent', async () => {
        const agent = agents[0];
        await pageObjects.agentBuilder.clickAgentChat(agent.id);
        await expect(page).toHaveURL(
          new RegExp(`/app/agent_builder/agents/${agent.id}/conversations/new`)
        );
        await expect(page.testSubj.locator('agentBuilderAgentSelectorButton')).toContainText(
          agent.name
        );
        await pageObjects.agentBuilder.navigateToApp('manage/agents');
      });

      await test.step('has edit link with correct href', async () => {
        expect(await pageObjects.agentBuilder.hasAgentEditLink(agents[0].id)).toBe(true);
      });

      await test.step('has clone link with correct href', async () => {
        expect(await pageObjects.agentBuilder.hasAgentCloneLink(agents[0].id)).toBe(true);
      });

      await test.step('deletes agent', async () => {
        const agent = agents[1];
        await pageObjects.agentBuilder.agentExistsOrFail(agent.id);
        const modal = await pageObjects.agentBuilder.openAgentDeleteModal(agent.id);
        await expect(modal.getTitle()).resolves.toContain(`Delete ${agent.name}`);
        await modal.clickConfirm();
        await pageObjects.agentBuilder.agentMissingOrFail(agent.id);
      });
    });
  }
);
