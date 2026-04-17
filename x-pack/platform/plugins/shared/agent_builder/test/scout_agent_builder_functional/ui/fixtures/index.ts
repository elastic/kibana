/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { AgentBuilderApp } from './page_objects';

interface AgentBuilderWorkerFixtures extends ScoutWorkerFixtures {
  llmProxy: LlmProxy;
}

export interface AgentBuilderUiFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    agentBuilder: AgentBuilderApp;
  };
}

export const test = baseTest.extend<AgentBuilderUiFixtures, AgentBuilderWorkerFixtures>({
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
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
    await use(page);
  },
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AgentBuilderUiFixtures['pageObjects'];
      page: AgentBuilderUiFixtures['page'];
    },
    use: (pageObjects: AgentBuilderUiFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      agentBuilder: createLazyPageObject(AgentBuilderApp, page),
    });
  },
});

export * as testData from './constants';
