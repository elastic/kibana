/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  BrowserAuthFixture,
  ScoutTestConfig,
} from '@kbn/scout';
import { test as baseTest, spaceTest as spaceBaseTest, createLazyPageObject } from '@kbn/scout';
import { DemoPage, MetricsExperiencePage } from './page_objects';
import { METRICS_EXPERIENCE_VIEWER_ROLE } from './constants';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
    metricsExperience: MetricsExperiencePage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
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
      demo: createLazyPageObject(DemoPage, page),
      metricsExperience: createLazyPageObject(MetricsExperiencePage, page, pageObjects.discover),
    };

    await use(extendedPageObjects);
  },
});

interface MetricsExperienceBrowserAuthFixture extends BrowserAuthFixture {
  loginAsMetricsViewer: () => Promise<void>;
}

export interface ExtParallelRunTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    demo: DemoPage;
    metricsExperience: MetricsExperiencePage;
  };
  browserAuth: MetricsExperienceBrowserAuthFixture;
}

export const spaceTest = spaceBaseTest.extend<
  ExtParallelRunTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtParallelRunTestFixtures['pageObjects'];
      page: ExtParallelRunTestFixtures['page'];
    },
    use: (pageObjects: ExtParallelRunTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      demo: createLazyPageObject(DemoPage, page),
      metricsExperience: createLazyPageObject(MetricsExperiencePage, page, pageObjects.discover),
    };

    await use(extendedPageObjects);
  },
  browserAuth: async (
    { browserAuth, config }: { browserAuth: BrowserAuthFixture; config: ScoutTestConfig },
    use: (browserAuth: MetricsExperienceBrowserAuthFixture) => Promise<void>
  ) => {
    const loginAsMetricsViewer = async () => {
      if (config.serverless && config.projectType === 'security') {
        return browserAuth.loginWithCustomRole(METRICS_EXPERIENCE_VIEWER_ROLE);
      }
      return browserAuth.loginAsViewer();
    };

    await use({ ...browserAuth, loginAsMetricsViewer });
  },
});

export * as testData from './constants';
export * as assertionMessages from './assertion_messages';
export * from './generators';
