/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PageObjects,
  ScoutPage,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { CustomContentPanelPage } from './page_objects';

export interface CustomContentTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    customContentPanel: CustomContentPanelPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  CustomContentTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: CustomContentTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: CustomContentTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      customContentPanel: createLazyPageObject(CustomContentPanelPage, page),
    });
  },
});

interface CustomContentChatWorkerFixtures extends ScoutWorkerFixtures {
  llmProxy: LlmProxy;
}

interface CustomContentChatTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    customContentPanel: CustomContentPanelPage;
  };
}

/**
 * Non-parallel test with an LLM proxy standing in for the model. The connector is global to the
 * cluster, so do not call `cleanStandardList`: it would delete it.
 */
export const test = baseTest.extend<CustomContentChatTestFixtures, CustomContentChatWorkerFixtures>(
  {
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
        pageObjects: CustomContentChatTestFixtures['pageObjects'];
        page: ScoutPage;
      },
      use: (pageObjects: CustomContentChatTestFixtures['pageObjects']) => Promise<void>
    ) => {
      await use({
        ...pageObjects,
        customContentPanel: createLazyPageObject(CustomContentPanelPage, page),
      });
    },
  }
);
