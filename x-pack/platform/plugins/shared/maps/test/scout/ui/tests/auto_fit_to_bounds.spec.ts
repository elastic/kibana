/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags, test } from '@kbn/scout';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ES_ARCHIVE_MAPS_DATA = 'x-pack/platform/test/fixtures/es_archives/maps/data';
const DEFAULT_INDEX_ID = 'c698b940-e149-11e8-a35a-370a8516603a';

// Saved map IDs from the kbn_archives/maps.json fixture
const AUTO_FIT_INITIAL_LOCATION_MAP_ID = '13776f20-db37-11ea-8fbb-3da39bb9bff2';
const JOIN_EXAMPLE_MAP_ID = '1649cc70-f736-11e8-8ce0-9723965e01e3';
const DOCUMENT_EXAMPLE_MAP_ID = 'd2e73f40-e14a-11e8-a35a-370a8516603a';

test.describe(
  'Maps - auto fit map to bounds',
  {
    tag: tags.stateful.classic,
  },
  () => {
    let prevDefaultIndex: string | number | boolean | undefined;

    test.beforeAll(async ({ kbnClient, esArchiver, uiSettings }) => {
      prevDefaultIndex = await kbnClient.uiSettings.get('defaultIndex');
      await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
      await esArchiver.loadIfNeeded(ES_ARCHIVE_MAPS_DATA);
      await kbnClient.importExport.load(KBN_ARCHIVE);
      await uiSettings.set({ defaultIndex: DEFAULT_INDEX_ID });
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await kbnClient.savedObjects.cleanStandardList();
      if (prevDefaultIndex !== undefined) {
        await uiSettings.set({ defaultIndex: prevDefaultIndex });
      } else {
        await uiSettings.unset('defaultIndex');
      }
    });

    test.describe('initial location', () => {
      test.beforeEach(async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.maps.openMapWithId(AUTO_FIT_INITIAL_LOCATION_MAP_ID);
      });

      test('should automatically fit to bounds on initial map load', async ({ pageObjects }) => {
        const hits = await pageObjects.maps.getHits();
        expect(hits).toBe('6');

        const { lat, lon } = await pageObjects.maps.getView();
        expect(Math.round(lat)).toBeGreaterThanOrEqual(41);
        expect(Math.round(lat)).toBeLessThanOrEqual(43);
        expect(Math.round(lon)).toBe(-99);
      });
    });

    test.describe('with joins', () => {
      test.beforeEach(async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.maps.openMapWithId(JOIN_EXAMPLE_MAP_ID);
        await pageObjects.maps.enableAutoFitToBounds();
      });

      test('should automatically fit to bounds when query is applied', async ({ pageObjects }) => {
        // Set view to other side of world so no matching results
        await pageObjects.maps.setView(0, 0, 6);

        // Setting query should trigger fit to bounds and move map
        const origView = await pageObjects.maps.getView();
        await pageObjects.maps.setAndSubmitQuery('prop1 >= 11');
        await pageObjects.maps.waitForMapPanAndZoom(origView);

        const { lat, lon } = await pageObjects.maps.getView();
        expect(Math.round(lat)).toBe(0);
        expect(Math.round(lon)).toBe(60);
      });
    });

    test.describe('without joins', () => {
      test.beforeEach(async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.maps.openMapWithId(DOCUMENT_EXAMPLE_MAP_ID);
        await pageObjects.maps.enableAutoFitToBounds();
      });

      test('should automatically fit to bounds when query is applied', async ({ pageObjects }) => {
        // Set view to other side of world so no matching results
        await pageObjects.maps.setView(-15, -100, 6);

        // Setting query should trigger fit to bounds and move map
        const origView = await pageObjects.maps.getView();
        await pageObjects.maps.setAndSubmitQuery('machine.os.raw : "ios"');
        await pageObjects.maps.waitForMapPanAndZoom(origView);

        const hits = await pageObjects.maps.getHits();
        expect(hits).toBe('2');

        const { lat, lon } = await pageObjects.maps.getView();
        expect(Math.round(lat)).toBe(43);
        expect(Math.round(lon)).toBe(-102);
      });

      test('should sync layers even when there is no data', async ({ pageObjects }) => {
        await pageObjects.maps.setAndSubmitQuery('machine.os.raw : "fake_os_with_no_matches"');

        const hits = await pageObjects.maps.getHits();
        expect(hits).toBe('0');
      });
    });
  }
);
