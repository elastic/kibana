/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiClientFixture,
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { apiClientFixture, test as baseTest, createLazyPageObject, mergeTests } from '@kbn/scout';

import { ApplicationConnectionsApp } from './page_objects';

export const COMMON_HEADERS = {
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const COMMON_UNSAFE_HEADERS = {
  ...COMMON_HEADERS,
  'kbn-xsrf': 'some-xsrf-token',
};

interface ApplicationConnectionsWorkerFixtures extends ScoutWorkerFixtures {
  apiClient: ApiClientFixture;
}

export interface ApplicationConnectionsUiFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    applicationConnections: ApplicationConnectionsApp;
  };
}

export const test = mergeTests(baseTest, apiClientFixture).extend<
  ApplicationConnectionsUiFixtures,
  ApplicationConnectionsWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ApplicationConnectionsUiFixtures['pageObjects'];
      page: ApplicationConnectionsUiFixtures['page'];
    },
    use: (pageObjects: ApplicationConnectionsUiFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      applicationConnections: createLazyPageObject(ApplicationConnectionsApp, page),
    });
  },
});
