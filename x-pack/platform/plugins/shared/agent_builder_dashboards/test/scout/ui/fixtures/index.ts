/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { DashboardChatPage } from './page_objects';

export interface AgentBuilderDashboardsTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    dashboardChat: DashboardChatPage;
  };
}

export const test = baseTest.extend<AgentBuilderDashboardsTestFixtures, ScoutWorkerFixtures>({
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
