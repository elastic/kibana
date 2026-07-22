/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, testData } from '../fixtures';

spaceTest.describe('Lens visualize geo field', { tag: tags.stateful.classic }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    timeRange: testData.LOGSTASH_GEO_DATES,
    dataViewNamePrefix: 'scout-lens-geo-field-dv',
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'visualizes geo fields in Maps with a document-count tooltip',
    async ({ browserAuth, pageObjects }) => {
      const { visualize, lens, maps } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      // Force URL navigation so Maps→Visualize does not leave stale editor state.
      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();
      await lens.switchDataPanelIndexPattern(testData.DATA_VIEW_ID.LOGSTASH);
      await lens.dragFieldToGeoFieldWorkspace('geo.coordinates');

      await maps.waitForLayersToLoad();
      await expect(maps.getLayerToggleButton('logstash-*')).toBeVisible();
      expect(await maps.getLayerTocTooltipMsg('logstash-*')).toBe(
        'logstash-*\nFound 66 documents.\nResults narrowed by global time'
      );
      await maps.refreshAndClearUnsavedChangesWarning();
    }
  );
});
