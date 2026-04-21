/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  KibanaUrl,
  PageObjects,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import {
  createLazyPageObject,
  spaceTest as baseSpaceTest,
  test as baseDefaultTest,
} from '@kbn/scout';
import {
  getOsqueryApiService,
  type OsqueryApiService,
} from '../../common/services/osquery_api_service';
import {
  AlertFlyoutPage,
  EcsMappingEditorPage,
  InventoryHostOsqueryPage,
  LiveQueryFormPage,
  OsqueryCasesPage,
  OsqueryNavigation,
  PackFormPage,
  RuleEditorPage,
  SavedQueryPage,
} from '../page_objects';

export interface OsqueryUiApiServicesFixture extends ApiServicesFixture {
  osquery: OsqueryApiService;
}

interface OsqueryPageObjectsExtension {
  osqueryNavigation: OsqueryNavigation;
  osqueryLiveQueryForm: LiveQueryFormPage;
  osquerySavedQuery: SavedQueryPage;
  osqueryEcsMappingEditor: EcsMappingEditorPage;
  osqueryPackForm: PackFormPage;
  osqueryAlertFlyout: AlertFlyoutPage;
  osqueryRuleEditor: RuleEditorPage;
  osqueryCasesPage: OsqueryCasesPage;
  osqueryInventoryHostOsquery: InventoryHostOsqueryPage;
}

/**
 * Default Kibana space: matches Docker `global.setup.ts` (Fleet + osquery_manager on default-space policies).
 * Use `workers: 1` in this Playwright project so parallel workers do not mutate the same space.
 */
export interface OsqueryUiTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & OsqueryPageObjectsExtension;
}

/**
 * Non-default Scout space (`/s/test-space-x/`): for space-routing / empty-state coverage only.
 * Fleet-backed Osquery flows stay on {@link OsqueryUiTestFixtures}.
 */
export interface OsqueryCustomSpaceUiTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & OsqueryPageObjectsExtension;
}

const extendOsqueryPageObjects = async (
  {
    pageObjects,
    page,
    kbnUrl,
  }: {
    pageObjects: PageObjects & OsqueryPageObjectsExtension;
    page: ScoutTestFixtures['page'];
    kbnUrl: KibanaUrl;
  },
  use: (extended: PageObjects & OsqueryPageObjectsExtension) => Promise<void>
) => {
  await use({
    ...pageObjects,
    osqueryNavigation: createLazyPageObject(OsqueryNavigation, page),
    osqueryLiveQueryForm: createLazyPageObject(LiveQueryFormPage, page),
    osquerySavedQuery: createLazyPageObject(SavedQueryPage, page),
    osqueryEcsMappingEditor: createLazyPageObject(EcsMappingEditorPage, page),
    osqueryPackForm: createLazyPageObject(PackFormPage, page),
    osqueryAlertFlyout: createLazyPageObject(AlertFlyoutPage, page),
    osqueryRuleEditor: createLazyPageObject(RuleEditorPage, page),
    osqueryCasesPage: createLazyPageObject(OsqueryCasesPage, page),
    osqueryInventoryHostOsquery: createLazyPageObject(InventoryHostOsqueryPage, page, kbnUrl),
  });
};

export const uiTest = baseDefaultTest.extend<
  OsqueryUiTestFixtures,
  { apiServices: OsqueryUiApiServicesFixture }
>({
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: ScoutWorkerFixtures['kbnClient'];
        log: ScoutWorkerFixtures['log'];
      },
      use: (extendedApiServices: OsqueryUiApiServicesFixture) => Promise<void>
    ) => {
      await use({
        ...apiServices,
        osquery: getOsqueryApiService({ kbnClient, log }),
      } as OsqueryUiApiServicesFixture);
    },
    { scope: 'worker' },
  ],
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: OsqueryUiTestFixtures['pageObjects'];
      page: OsqueryUiTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (extended: OsqueryUiTestFixtures['pageObjects']) => Promise<void>
  ) => extendOsqueryPageObjects({ pageObjects, page, kbnUrl }, use),
});

export const customSpaceUiTest = baseSpaceTest.extend<
  OsqueryCustomSpaceUiTestFixtures,
  { apiServices: OsqueryUiApiServicesFixture }
>({
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
        scoutSpace,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: ScoutParallelWorkerFixtures['kbnClient'];
        log: ScoutParallelWorkerFixtures['log'];
        scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'];
      },
      use: (extendedApiServices: OsqueryUiApiServicesFixture) => Promise<void>
    ) => {
      await use({
        ...apiServices,
        osquery: getOsqueryApiService({ kbnClient, log, spaceId: scoutSpace.id }),
      } as OsqueryUiApiServicesFixture);
    },
    { scope: 'worker' },
  ],
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: OsqueryCustomSpaceUiTestFixtures['pageObjects'];
      page: OsqueryCustomSpaceUiTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (extended: OsqueryCustomSpaceUiTestFixtures['pageObjects']) => Promise<void>
  ) => extendOsqueryPageObjects({ pageObjects, page, kbnUrl }, use),
});

export * as testData from '../../api/fixtures/constants';
