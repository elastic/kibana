/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { createGenAiConnectorForProxy, deleteAllConnectors } from './connector_kbn';
import { DashboardChatPage } from './page_objects';

interface AgentBuilderDashboardsWorkerFixtures extends ScoutWorkerFixtures {
  llmProxy: LlmProxy;
}

export interface AgentBuilderDashboardsTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    dashboardChat: DashboardChatPage;
  };
}

export const test = baseTest.extend<
  AgentBuilderDashboardsTestFixtures,
  AgentBuilderDashboardsWorkerFixtures
>({
  // EmbeddableAccessBoundary requires at least one LLM connector before the
  // conversation editor is rendered. Mirror Agent Builder Scout UI setup.
  llmProxy: [
    async ({ log, kbnClient }, use) => {
      const proxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, proxy);
      await use(proxy);
      proxy.close();
      await deleteAllConnectors(kbnClient);
    },
    { scope: 'worker', auto: true },
  ],
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AgentBuilderDashboardsTestFixtures['pageObjects'];
      page: AgentBuilderDashboardsTestFixtures['page'];
    },
    use: (pageObjects: AgentBuilderDashboardsTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      dashboardChat: createLazyPageObject(DashboardChatPage, page),
    });
  },
});
