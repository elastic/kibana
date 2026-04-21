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
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { createLazyPageObject, test as baseTest } from '@kbn/scout';
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

/**
 * Osquery Scout UI runs on the default Kibana space. `global.setup.ts` enrolls Fleet
 * and `osquery_manager` against default-space policies, and `parallel.playwright.config.ts`
 * uses `workers: 1` to avoid parallel mutations of shared default-space saved objects.
 * Phase 5.4 re-introduces a `spaceTest`-based variant alongside multi-worker execution.
 */
export interface OsqueryUiTestFixtures extends ScoutTestFixtures {
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

export const uiTest = baseTest.extend<
  OsqueryUiTestFixtures,
  { apiServices: OsqueryUiApiServicesFixture } & ScoutWorkerFixtures
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
    use: (pageObjects: OsqueryUiTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
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
    };

    await use(extendedPageObjects);
  },
});

export * as testData from '../../api/fixtures/constants';
