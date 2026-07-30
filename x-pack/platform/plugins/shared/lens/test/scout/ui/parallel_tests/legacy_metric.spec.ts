/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { setLogstashUiSettings, unsetLogstashUiSettings, testData } from '../fixtures';

// Dynamic-coloring outputs are deterministic for the fixed logstash archive, so the exact
// palette colors are asserted (same approach as metric_progress_bar_lens_editor.spec.ts).
const LABELS_COLOR = 'rgb(252, 216, 131)';
const RANGE_TWEAKED_COLOR = 'rgb(36, 194, 146)';
const REVERSED_COLOR = 'rgb(246, 114, 106)';
const TEMPERATURE_COLOR = 'rgb(235, 239, 245)';

spaceTest.describe('Lens legacy metric', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await setLogstashUiSettings({ scoutSpace });
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_PATHS.LENS_BASIC);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects: { visualize, listingTable, lens } }) => {
    await browserAuth.loginAsPrivilegedUser();
    await visualize.goto();
    await listingTable.searchForItemTitle(testData.VISUALIZATION_TITLES.LEGACY_METRIC);
    await visualize.openSavedLensVisualization(testData.VISUALIZATION_TITLES.LEGACY_METRIC);
    await lens.waitForVisualization('legacyMtrVis');
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await unsetLogstashUiSettings({ scoutSpace });
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'renders, filters and dynamically colors a legacy metric',
    async ({ pageObjects: { lens, filterBar } }) => {
      await spaceTest.step('renders a numeric metric', async () => {
        const { title, value } = await lens.getLegacyMetricData();
        expect(title).toBe('Maximum of bytes');
        // Backend-computed aggregation: assert it renders as a formatted number rather than
        // pinning the exact figure (plan §2b assertion hygiene).
        expect(value).toMatch(/^[\d,]+$/);
      });

      await spaceTest.step('creates a filter when the metric is clicked', async () => {
        await lens.clickLegacyMetric();
        await expect.poll(() => filterBar.getFilterCount()).toBe(1);
        await filterBar.removeAllFilters();
      });

      await spaceTest.step('colors the metric text based on its value', async () => {
        await lens.openDimensionEditor('lns-dimensionTrigger');
        await lens.setLegacyMetricColoringMode('labels');

        // Coloring updates are debounced, so assert the computed color (auto-retries)
        // rather than a point-in-time read of the `style` attribute.
        await expect(lens.getLegacyMetricValueLocator()).toHaveCSS('color', LABELS_COLOR);
        expect((await lens.getLegacyMetricStyle())['background-color']).toBeUndefined();
      });

      await spaceTest.step('recolors the metric when tweaking the palette range', async () => {
        await lens.openPalettePanelFlyout();
        await lens.setPaletteRangeValue(1, '21000');

        await expect(lens.getLegacyMetricValueLocator()).toHaveCSS('color', RANGE_TWEAKED_COLOR);
      });

      await spaceTest.step('recolors the metric when reversing the palette', async () => {
        await lens.reversePaletteColors();

        await expect(lens.getLegacyMetricValueLocator()).toHaveCSS('color', REVERSED_COLOR);
      });

      await spaceTest.step('resets the color stops when picking a predefined palette', async () => {
        await lens.changePaletteTo('temperature');

        await expect(lens.getLegacyMetricValueLocator()).toHaveCSS('color', TEMPERATURE_COLOR);
      });
    }
  );
});
