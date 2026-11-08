/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import type { KbnClient, ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { DataFederationPage } from './page_objects/data_federation_page';
import {
  getDataFederationSetting,
  setDataFederationSetting,
  unsetDataFederationSetting,
} from './data_federation_setting';

interface DataFederationFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    dataFederation: DataFederationPage;
  };
}

interface DataFederationWorkerFixtures extends ScoutWorkerFixtures {
  dataFederationUiEnabled: void;
}

export const test = base.extend<DataFederationFixtures, DataFederationWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: ScoutTestFixtures['pageObjects']; page: ScoutPage },
    use
  ) => {
    await use({
      ...pageObjects,
      dataFederation: new DataFederationPage(page),
    } as DataFederationFixtures['pageObjects']);
  },
  /**
   * The management app is gated behind the `dataFederation:enabled` global setting. Enabling it
   * at runtime keeps the suite portable to deployments where server args can't be set, and the
   * previous value is restored so other suites sharing the deployment aren't affected.
   */
  dataFederationUiEnabled: [
    async ({ kbnClient }: { kbnClient: KbnClient }, use: () => Promise<void>) => {
      const previousValue = await getDataFederationSetting(kbnClient);
      await setDataFederationSetting(kbnClient, true);

      await use();

      if (previousValue === undefined) {
        await unsetDataFederationSetting(kbnClient);
      } else {
        await setDataFederationSetting(kbnClient, previousValue);
      }
    },
    { scope: 'worker', auto: true },
  ],
});

export { CUSTOM_ROLES } from './custom_roles';
