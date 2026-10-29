/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const KBN_ARCHIVE = 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json';
const ES_ARCHIVE_LOGSTASH = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';

test.describe('Maps - Lens choropleth chart', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LOGSTASH);
    await kbnClient.importExport.load(KBN_ARCHIVE);
    await kbnClient.uiSettings.update({
      defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a', // logstash-*
      'timepicker:timeDefaults':
        '{ "from": "2015-09-19T06:31:44.000Z", "to": "2015-09-23T18:31:44.000Z" }',
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    // Test requires access to Elastic Maps Service
    // Do not skip test if failure is "Test requires access to Elastic Maps Service (EMS). EMS is not available"
    await pageObjects.maps.expectEmsToBeAvailable();
    await pageObjects.visualize.goto();
    await pageObjects.visualize.openNewVisualizationWizard();
    await pageObjects.visualize.clickVisType('lens');
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
    await kbnClient.uiSettings.unset('timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should allow creation of choropleth chart', async ({ pageObjects }) => {
    const { lens, maps } = pageObjects;

    await lens.switchToVisualization('lnsChoropleth', { search: 'Region map' });

    await lens.configureDimension({
      dimension: 'lnsChoropleth_regionKeyDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      field: 'geo.dest',
    });

    await lens.configureDimension({
      dimension: 'lnsChoropleth_valueDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await maps.openLegend();
    await maps.waitForLayersToLoad();

    expect(await maps.getNumberOfLayers()).toBe(2);
    expect(await maps.doesLayerExist('World Countries by Average of bytes')).toBe(true);
  });

  test('should create choropleth chart from suggestion', async ({ page, pageObjects }) => {
    const { lens, maps, filterBar } = pageObjects;

    await lens.dragFieldToWorkspace('geo.dest', 'xyVisChart');

    // add filter to force data fetch to set activeData
    await filterBar.addFilter({
      field: 'bytes',
      operator: 'is between',
      value: { from: '200', to: '10000' },
    });

    await page.testSubj.click('lnsSuggestion-worldCountriesByCountOfRecords > lnsSuggestion');

    await maps.openLegend();
    await maps.waitForLayersToLoad();

    expect(await maps.getNumberOfLayers()).toBe(2);
    expect(await maps.doesLayerExist('World Countries by Count of records')).toBe(true);
  });
});
