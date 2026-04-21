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
} from '@kbn/scout';
import { createLazyPageObject, spaceTest as baseSpaceTest } from '@kbn/scout';
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

export interface OsqueryUiTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    osqueryNavigation: OsqueryNavigation;
    osqueryLiveQueryForm: LiveQueryFormPage;
    osquerySavedQuery: SavedQueryPage;
    osqueryEcsMappingEditor: EcsMappingEditorPage;
    osqueryPackForm: PackFormPage;
    osqueryAlertFlyout: AlertFlyoutPage;
    osqueryRuleEditor: RuleEditorPage;
    osqueryCasesPage: OsqueryCasesPage;
    osqueryInventoryHostOsquery: InventoryHostOsqueryPage;
  };
}

export const uiTest = baseSpaceTest.extend<
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
        kbnClient: ScoutParallelWorkerFixtures['kbnClient'];
        log: ScoutParallelWorkerFixtures['log'];
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
  },
});

export * as testData from '../../api/fixtures/constants';
