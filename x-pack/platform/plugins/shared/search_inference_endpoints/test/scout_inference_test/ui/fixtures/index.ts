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
} from '@kbn/scout';
import { test as baseTest, spaceTest as spaceBase, createLazyPageObject } from '@kbn/scout';
import {
  FeatureSettingsPage,
  EisModelsPage,
  ExternalInferencePage,
  PageNavigation,
} from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    featureSettings: FeatureSettingsPage;
    eisModels: EisModelsPage;
    externalInference: ExternalInferencePage;
    navigation: PageNavigation;
  };
}

export interface ExtScoutParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: ScoutParallelTestFixtures['pageObjects'] & {
    featureSettings: FeatureSettingsPage;
    eisModels: EisModelsPage;
    externalInference: ExternalInferencePage;
    navigation: PageNavigation;
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
      featureSettings: createLazyPageObject(FeatureSettingsPage, page),
      eisModels: createLazyPageObject(EisModelsPage, page),
      externalInference: createLazyPageObject(ExternalInferencePage, page),
      navigation: createLazyPageObject(PageNavigation, page),
    };

    await use(extendedPageObjects);
  },
});

export const spaceTest = spaceBase.extend<
  ExtScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutParallelTestFixtures['pageObjects'];
      page: ExtScoutParallelTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      featureSettings: createLazyPageObject(FeatureSettingsPage, page),
      eisModels: createLazyPageObject(EisModelsPage, page),
      externalInference: createLazyPageObject(ExternalInferencePage, page),
      navigation: createLazyPageObject(PageNavigation, page),
    };

    await use(extendedPageObjects);
  },
});
