/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../fixtures';

spaceTest.describe('Lens visualize geo field', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    // Narrow 4h window matching FTR geo_field coverage.
    timeRange: {
      from: 'Sep 22, 2015 @ 00:00:00.000',
      to: 'Sep 22, 2015 @ 04:00:00.000',
    },
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'visualizes geo fields in Maps with a document-count tooltip',
    async ({ page, pageObjects }) => {
      const { lens, maps } = pageObjects;

      await lens.switchDataPanelIndexPattern(testData.DATA_VIEW_ID.LOGSTASH);
      await lens.dragFieldToGeoFieldWorkspace('geo.coordinates');

      await maps.waitForLayersToLoad();
      await expect(maps.getLayerToggleButton('logstash-*')).toBeVisible();
      // Exact document count → #280444. UI asserts Maps shows a doc-count tooltip.
      await expect
        .poll(async () => maps.getLayerTocTooltipMsg('logstash-*'))
        .toMatch(/logstash-\*[\s\S]*Found \d+ documents?\.[\s\S]*Results narrowed by global time/);

      const { violations } = await page.checkA11y({
        include: ['#maps-plugin'],
      });
      expect(violations).toHaveLength(0);

      await maps.refreshAndClearUnsavedChangesWarning();
    }
  );
});
