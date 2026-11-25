/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_ALERTS_AND_CONNECTORS_ALL_ROLE,
  ALERTING_V2_ALERTS_AND_CONNECTORS_READ_ROLE,
} from '../../../common/roles';
import { buildCreateExternalSourceData, test, testData } from '../fixtures';

/*
 * The Import alerts page lists external sources from the external source list API, and searches,
 * sorts and pages on the server. The imports are created through the API, which also creates
 * their Datadog connectors. The page is only reachable with the experimental features setting on.
 */
test.describe('Import alerts page - list', { tag: testData.UI_TAG }, () => {
  test.beforeAll(async ({ apiServices, kbnClient }) => {
    await kbnClient.uiSettings.update({ [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true });
    await apiServices.alertingV2.externalSources.cleanUp();
    for (const [id, name] of [
      ['scout-ui-import-alpha', 'Alpha production'],
      ['scout-ui-import-bravo', 'Bravo staging'],
      ['scout-ui-import-charlie', 'Charlie production'],
    ]) {
      await apiServices.alertingV2.externalSources.create(
        buildCreateExternalSourceData({ id, metadata: { name } })
      );
    }
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    try {
      await apiServices.alertingV2.externalSources.cleanUp();
    } finally {
      await kbnClient.uiSettings.unset(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);
    }
  });

  test('lists, searches and sorts imports', async ({ browserAuth, pageObjects }) => {
    const { importsList } = pageObjects;
    await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_AND_CONNECTORS_READ_ROLE);
    await importsList.goto();

    await test.step('lists every import by name, with its type', async () => {
      await expect(importsList.nameCells).toHaveText([
        /Alpha production/,
        /Bravo staging/,
        /Charlie production/,
      ]);
      await expect(importsList.typeCells).toHaveText([/Datadog/, /Datadog/, /Datadog/]);
    });

    await test.step('searches on the server', async () => {
      await importsList.search('production');
      await expect(importsList.nameCells).toHaveText([/Alpha production/, /Charlie production/]);
    });

    await test.step('sorts by name, descending', async () => {
      await importsList.search('');
      await expect(importsList.nameCells).toHaveCount(3);
      await importsList.sortBy('Name');
      await expect(importsList.nameCells).toHaveText([
        /Charlie production/,
        /Bravo staging/,
        /Alpha production/,
      ]);
    });

    await test.step('hides the delete action from a read-only user', async () => {
      await expect(importsList.actionsButtons).toHaveCount(0);
    });
  });

  test('deletes an import', async ({ browserAuth, pageObjects }) => {
    const { importsList } = pageObjects;
    await browserAuth.loginWithCustomRole(ALERTING_V2_ALERTS_AND_CONNECTORS_ALL_ROLE);
    await importsList.goto();
    await expect(importsList.nameCells).toHaveCount(3);

    await importsList.deleteImport('scout-ui-import-bravo');

    await expect(importsList.nameCells).toHaveText([/Alpha production/, /Charlie production/]);
  });
});
