/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';

// Data views the archive creates for these ids must not exist, so the layers
// that reference them show their missing id as the display name.
const MISSING_DATA_VIEW_IDS = [
  'idThatDoesNotExitForESSearchSource',
  'idThatDoesNotExitForESGeoGridSource',
  'idThatDoesNotExitForESJoinSource',
];

const LAYER_WITH_ERRORS_MAP_ID = '745c98b0-23e1-11e9-a048-6fef5a3e0d1e';

const LAYER_ERRORS = [
  { description: 'invalid descriptor', layerName: 'fff76ebb-57a6-4067-a373-1d191b9bd1a3' },
  {
    description: 'ESSearchSource with missing index pattern id',
    layerName: 'idThatDoesNotExitForESSearchSource',
  },
  {
    description: 'ESGeoGridSource with missing index pattern id',
    layerName: 'idThatDoesNotExitForESGeoGridSource',
  },
  { description: 'ESJoinSource with missing index pattern id', layerName: 'geo_shapes*' },
  { description: 'EMSFileSource with missing EMS id', layerName: 'EMS_vector_shapes' },
  { description: 'EMSTMSSource with missing EMS id', layerName: 'EMS_tiles' },
  {
    description: 'KibanaTilemapSource with missing map.tilemap.url configuration',
    layerName: 'Custom_TMS',
  },
];

test.describe('Maps - layer errors', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
    await kbnClient.importExport.load(KBN_ARCHIVE);
    for (const id of MISSING_DATA_VIEW_IDS) {
      await kbnClient.savedObjects.delete({ type: 'index-pattern', id });
    }
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.maps.openMapWithId(LAYER_WITH_ERRORS_MAP_ID);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should display layer errors', async ({ page, pageObjects }) => {
    for (const { description, layerName } of LAYER_ERRORS) {
      await test.step(`${description}: should display error icon in legend`, async () => {
        await expect(pageObjects.maps.getLayerErrorIcon(layerName)).toBeVisible();
      });

      await test.step(`${description}: should allow deletion of layer`, async () => {
        await pageObjects.maps.removeLayer(layerName);
        expect(await pageObjects.maps.doesLayerExist(layerName)).toBe(false);
      });
    }

    // The callout is announced with `announceOnMount`, which renders a second copy of its
    // content in a screen reader live region (role="status"). Target the visible copy.
    const viewDetailsButton = page.testSubj
      .locator('mapLayerTOCDetailsconnections')
      .locator('[data-test-subj="viewEsErrorButton"]:not([role="status"] *)');

    await test.step('EsError: should display error icon in legend', async () => {
      await expect(pageObjects.maps.getLayerErrorIcon('connections')).toBeVisible();
    });

    await test.step('EsError: should display "View details" button', async () => {
      await expect(viewDetailsButton).toBeVisible();
    });

    await test.step('EsError: should open request in inspector', async () => {
      await viewDetailsButton.click();
      try {
        const selectedRequests = await page.components
          .comboBox('inspectorRequestChooser')
          .getSelectedOptions();
        expect(selectedRequests).toStrictEqual(['load layer features (connections)']);
      } finally {
        await pageObjects.inspector.close();
      }
    });
  });
});
