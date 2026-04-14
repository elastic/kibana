/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { AgentBuilderApp } from './page_objects';

export interface AgentBuilderUiFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    agentBuilder: AgentBuilderApp;
  };
}

export const test = baseTest.extend<AgentBuilderUiFixtures, ScoutWorkerFixtures>({
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
