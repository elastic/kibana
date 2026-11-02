/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout/ui';
import { test } from '@kbn/scout';
import { GeoFileUploadPage } from '../fixtures/geo_file_upload';

const SHAPEFILE = path.join(__dirname, '../fixtures/files/cb_2018_us_csa_500k.shp');

test.describe(
  'Maps - shapefile upload',
  {
    tag: '@local-stateful-classic',
  },
  () => {
    let indexName = '';

    test.afterAll(async ({ esClient }) => {
      if (indexName) {
        await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
      }
    });

    test('shapefile upload', async ({ browserAuth, page, pageObjects }) => {
      const { maps } = pageObjects;
      const geoFileUpload = new GeoFileUploadPage(page);

      await browserAuth.loginAsAdmin();
      await maps.gotoNewMap();
      await maps.openAddLayerFlyout();
      await maps.selectFileUploadCard();

      await test.step('should preview part of shapefile', async () => {
        await geoFileUpload.previewShapefile(SHAPEFILE);
        await maps.waitForLayersToLoad();

        expect(await maps.getNumberOfLayers()).toBe(2);
      });

      await test.step('should import shapefile', async () => {
        indexName = uuidv4();
        await geoFileUpload.setIndexName(indexName);
        await geoFileUpload.uploadFile();

        expect(await geoFileUpload.getFileUploadStatusCalloutMsg()).toBe(
          'File upload complete\nIndexed 174 features.'
        );
      });

      await test.step('should add as document layer', async () => {
        await maps.setView(0, 0, 1);
        await geoFileUpload.addFileAsDocumentLayer();
        await maps.waitForLayersToLoad();

        expect(await maps.getNumberOfLayers()).toBe(2);

        await expect
          .poll(
            async () => {
              return maps.getLayerTocTooltipMsg(indexName);
            },
            { timeout: 60_000 }
          )
          .toBe(`${indexName}\nFound 174 documents.`);
      });
    });
  }
);
