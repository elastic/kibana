/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
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
    async ({ apiServices, log }, use) => {
      const proxy = await createLlmProxy(log);
      await apiServices.alerting.cleanup.deleteAllConnectors();
      await apiServices.alerting.connectors.create({
        name: 'llm-proxy',
        connectorTypeId: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${proxy.getPort()}`,
          defaultModel: 'gpt-4',
        },
        secrets: { apiKey: 'myApiKey' },
      });
      await use(proxy);
      proxy.close();
      await apiServices.alerting.cleanup.deleteAllConnectors();
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
