/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import {
  AppearancePageObject,
  CloudLinksPageObject,
  CloudOnboardingPageObject,
  ConnectionDetailsPageObject,
  TrialInterceptPageObject,
} from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    appearance: AppearancePageObject;
    cloudLinks: CloudLinksPageObject;
    cloudOnboarding: CloudOnboardingPageObject;
    connectionDetails: ConnectionDetailsPageObject;
    trialIntercept: TrialInterceptPageObject;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
      kbnUrl: ScoutWorkerFixtures['kbnUrl'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      appearance: createLazyPageObject(AppearancePageObject, page),
      cloudLinks: createLazyPageObject(CloudLinksPageObject, page),
      cloudOnboarding: createLazyPageObject(CloudOnboardingPageObject, page, kbnUrl),
      connectionDetails: createLazyPageObject(ConnectionDetailsPageObject, page),
      trialIntercept: createLazyPageObject(TrialInterceptPageObject, page),
    });
  },
});

export * as testData from './constants';
