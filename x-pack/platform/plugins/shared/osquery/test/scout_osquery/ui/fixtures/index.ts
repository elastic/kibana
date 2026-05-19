/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  BrowserAuthFixture,
  KibanaUrl,
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { createLazyPageObject, test as baseTest, spaceTest as spaceBaseTest } from '@kbn/scout';
import {
  getOsqueryApiService,
  type OsqueryApiService,
} from '../../common/services/osquery_api_service';
import {
  AlertFlyoutPage,
  CustomSpacePage,
  EcsMappingEditorPage,
  FleetIntegrationPage,
  InventoryHostOsqueryPage,
  LiveQueryFormPage,
  OsqueryCasesPage,
  OsqueryNavigation,
  PackFormPage,
  RuleEditorPage,
  SavedQueryPage,
} from '../page_objects';
import { osqueryPowerUserRole } from './osquery_power_user_role';

/**
 * Extends `@kbn/scout`'s `BrowserAuthFixture` with `loginAsOsqueryPowerUser()`.
 * Backed by `loginWithCustomRole(osqueryPowerUserRole)` so the same descriptor
 * works on stateful and serverless without importing `@kbn/scout-security`.
 * Replaces `loginAsAdmin()` in every parallel_tests spec; admin login remains
 * reserved for `global.setup.ts` / `global.teardown.ts` superuser operations.
 */
export interface OsqueryBrowserAuthFixture extends BrowserAuthFixture {
  loginAsOsqueryPowerUser: () => Promise<void>;
}

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
  browserAuth: OsqueryBrowserAuthFixture;
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
    osqueryFleetIntegration: FleetIntegrationPage;
    osqueryCustomSpace: CustomSpacePage;
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
  browserAuth: async (
    {
      browserAuth,
    }: {
      browserAuth: BrowserAuthFixture;
    },
    use: (extendedBrowserAuth: OsqueryBrowserAuthFixture) => Promise<void>
  ) => {
    const loginAsOsqueryPowerUser = () => browserAuth.loginWithCustomRole(osqueryPowerUserRole);
    await use({ ...browserAuth, loginAsOsqueryPowerUser });
  },
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
      osqueryFleetIntegration: createLazyPageObject(FleetIntegrationPage, page),
      osqueryCustomSpace: createLazyPageObject(CustomSpacePage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

/**
 * Space-scoped variant of `uiTest` for tests that exercise non-default Kibana spaces
 * (e.g. `custom_space.spec.ts`). The Scout-assigned `scoutSpace.id` is forwarded to
 * `getOsqueryApiService` so all osquery HTTP paths are prefixed with `/s/{scoutSpace.id}`.
 * Default-space `uiTest` is unchanged.
 */
export const customSpaceUiTest = spaceBaseTest.extend<
  OsqueryUiTestFixtures,
  { apiServices: OsqueryUiApiServicesFixture } & ScoutWorkerFixtures & {
      scoutSpace: { id: string };
    }
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
        kbnClient: ScoutWorkerFixtures['kbnClient'];
        log: ScoutWorkerFixtures['log'];
        scoutSpace: { id: string };
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
  browserAuth: async (
    {
      browserAuth,
    }: {
      browserAuth: BrowserAuthFixture;
    },
    use: (extendedBrowserAuth: OsqueryBrowserAuthFixture) => Promise<void>
  ) => {
    const loginAsOsqueryPowerUser = () => browserAuth.loginWithCustomRole(osqueryPowerUserRole);
    await use({ ...browserAuth, loginAsOsqueryPowerUser });
  },
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
      osqueryFleetIntegration: createLazyPageObject(FleetIntegrationPage, page),
      osqueryCustomSpace: createLazyPageObject(CustomSpacePage, page, kbnUrl),
    };
    await use(extendedPageObjects);
  },
});
