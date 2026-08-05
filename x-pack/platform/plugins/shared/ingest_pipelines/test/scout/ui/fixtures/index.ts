/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BrowserAuthFixture,
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import * as testData from './constants';
import { IngestPipelinesPage } from './page_objects';

const KIBANA_ADMIN_WITHOUT_INGEST_ROLE = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

export interface IngestPipelinesBrowserAuthFixture extends BrowserAuthFixture {
  loginAsIngestPipelinesUser: () => Promise<void>;
  loginAsManageProcessorsUser: () => Promise<void>;
  loginAsDashboardReadWithIngest: () => Promise<void>;
  loginAsDevToolsReadWithIngest: () => Promise<void>;
  loginAsKibanaAdminWithoutIngest: () => Promise<void>;
}

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  browserAuth: IngestPipelinesBrowserAuthFixture;
  pageObjects: PageObjects & {
    ingestPipelines: IngestPipelinesPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (browserAuth: IngestPipelinesBrowserAuthFixture) => Promise<void>
  ) => {
    await use({
      ...browserAuth,
      loginAsIngestPipelinesUser: () =>
        browserAuth.loginWithCustomRole(testData.INGEST_PIPELINES_USER_ROLE),
      loginAsManageProcessorsUser: () =>
        browserAuth.loginWithCustomRole(testData.MANAGE_PROCESSORS_USER_ROLE),
      loginAsDashboardReadWithIngest: () =>
        browserAuth.loginWithCustomRole(testData.GLOBAL_DASHBOARD_READ_WITH_INGEST_PIPELINES_ROLE),
      loginAsDevToolsReadWithIngest: () =>
        browserAuth.loginWithCustomRole(testData.GLOBAL_DEVTOOLS_READ_WITH_INGEST_PIPELINES_ROLE),
      loginAsKibanaAdminWithoutIngest: () =>
        browserAuth.loginWithCustomRole(KIBANA_ADMIN_WITHOUT_INGEST_ROLE),
    });
  },
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      ingestPipelines: createLazyPageObject(IngestPipelinesPage, page),
    };

    await use(extendedPageObjects);
  },
});

export { testData };
