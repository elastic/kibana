/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../fixtures';

// Dynamic-coloring outputs are deterministic for the fixed logstash archive, so the exact
// palette colors are asserted (same approach as metric_progress_bar_lens_editor.spec.ts).
const LABELS_COLOR = 'rgb(252, 216, 131)';
const RANGE_TWEAKED_COLOR = 'rgb(36, 194, 146)';
const REVERSED_COLOR = 'rgb(246, 114, 106)';
const TEMPERATURE_COLOR = 'rgb(235, 239, 245)';

spaceTest.describe('Lens legacy metric', { tag: '@local-stateful-classic' }, () => {
  // The saved legacy metric comes from the `lens_basic` archive, so open it instead of an
  // empty editor.
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    loadLensArchives: true,
    skipEmptyLensOpen: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
    await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });

    const { visualize, lens } = pageObjects;
    await visualize.goto();
    await visualize.openSavedVisualization(testData.LENS_BASIC_TITLES.ARTIST_METRIC, {
      waitFor: 'lens',
    });
    await lens.waitForVisualization('legacyMtrVis');
  });

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'renders, filters and dynamically colors a legacy metric',
    async ({ pageObjects: { lens, filterBar } }) => {
      await spaceTest.step('renders a numeric metric', async () => {
        const { title, value } = await lens.metric.getLegacyMetricData();
        expect(title).toBe(testData.MAX_BYTES_LABEL);
        // Backend-computed aggregation: assert it renders as a formatted number rather than
        // pinning the exact figure.
        expect(value).toMatch(/^[\d,]+$/);
      });

      await spaceTest.step('creates a filter when the metric is clicked', async () => {
        await lens.metric.clickLegacyMetric();
        await expect.poll(() => filterBar.getFilterCount()).toBe(1);
        await filterBar.removeAllFilters();
      });

      await spaceTest.step('colors the metric text based on its value', async () => {
        await lens.dimensions.openDimensionEditor('lns-dimensionTrigger');
        await lens.metric.setLegacyMetricColoringMode('labels');

        // Coloring updates are debounced, so assert the computed color (auto-retries)
        // rather than a point-in-time read of the `style` attribute.
        await expect(lens.metric.legacyMetricValue).toHaveCSS('color', LABELS_COLOR);
        expect((await lens.metric.getLegacyMetricStyle())['background-color']).toBeUndefined();
      });

      await spaceTest.step('recolors the metric when tweaking the palette range', async () => {
        await lens.openPalettePanelFlyout();
        await lens.style.setPaletteRangeValue(1, '21000');

        await expect(lens.metric.legacyMetricValue).toHaveCSS('color', RANGE_TWEAKED_COLOR);
      });

      await spaceTest.step('recolors the metric when reversing the palette', async () => {
        await lens.style.reversePaletteColors();

        await expect(lens.metric.legacyMetricValue).toHaveCSS('color', REVERSED_COLOR);
      });

      await spaceTest.step('resets the color stops when picking a predefined palette', async () => {
        await lens.style.changePaletteTo('temperature');

        await expect(lens.metric.legacyMetricValue).toHaveCSS('color', TEMPERATURE_COLOR);
      });
    }
  );
});
