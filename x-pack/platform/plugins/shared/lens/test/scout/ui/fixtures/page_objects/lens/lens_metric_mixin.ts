/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAppConstructor } from './mixin_types';
import { normalizeComputedColor, parseInlineStyle } from './lens_editor_helpers';

/** Elastic Charts metric tile reading, and the legacy metric visualization. */
export function withLensMetric<TBase extends LensAppConstructor>(Base: TBase) {
  return class extends Base {
    // Elastic Charts pads the last grid row with empty filler cells (`role="presentation"`,
    // no title/value) to keep tile sizing consistent; excluded since they aren't real metrics.
    public get metricTilesLocator() {
      return this.page.locator('[data-test-subj="mtrVis"] .echChart li:not([role="presentation"])');
    }

    // Scope Elastic Charts class selectors to the metric workspace so chrome/other
    // panels with the same classes can't produce false positives.
    public get secondaryMetricBadge() {
      return this.page.locator('[data-test-subj="mtrVis"] .echBadge__content');
    }

    public get secondaryMetricLabel() {
      return this.page.locator('[data-test-subj="mtrVis"] .echSecondaryMetric__label');
    }

    public get metricProgressBar() {
      return this.page.locator('[data-test-subj="mtrVis"] .echSingleMetricProgress');
    }

    public get legacyMetricValue() {
      return this.page.testSubj.locator('metric_value');
    }

    /** Locator matching every Elastic Charts metric tile currently rendered. */
    getMetricTilesLocator() {
      return this.metricTilesLocator;
    }

    /** Returns locators for each Elastic Charts metric tile currently rendered. */
    getMetricTiles() {
      return this.metricTilesLocator.all();
    }

    /**
     * Clicks the metric tile whose title matches exactly (e.g. to trigger a click-to-filter
     * action). Throws if no tile has that title.
     */
    async clickMetricTileByTitle(title: string) {
      const data = await this.getMetricVisualizationData();
      const index = data.findIndex((datum) => datum.title === title);
      if (index === -1) {
        throw new Error(`Metric tile with title "${title}" not found`);
      }
      const tiles = await this.getMetricTiles();
      await tiles[index].click();
    }

    /**
     * Returns the progress-bar locator rendered on metric tiles once a "max" dimension is set.
     * Elastic Charts adds this element in a render pass after the one `waitForVisualization`
     * settles on, so callers that need to assert it appears should poll this locator's `count()`
     * before snapshotting tile state via `getMetricVisualizationData`.
     */
    getMetricProgressBarLocator() {
      return this.metricProgressBar;
    }

    /** Reads the current state of every metric tile inside `[data-test-subj="mtrVis"]`. */
    async getMetricVisualizationData() {
      const tiles = await this.getMetricTiles();
      const showingBar = (await this.metricProgressBar.count()) > 0;

      const data = [];
      for (const tile of tiles) {
        const getText = async (selector: string) => {
          const el = tile.locator(selector);
          if ((await el.count()) === 0) return undefined;
          return el.evaluate((node) => (node as HTMLElement).innerText);
        };
        const getColor = async (selector: string) => {
          const el = tile.locator(selector);
          if ((await el.count()) === 0) return undefined;
          const color = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
          return normalizeComputedColor(color);
        };

        data.push({
          title: await getText('h2'),
          subtitle: await getText('.echMetricText__subtitle'),
          extraText: await getText('.echMetricText__extraBlock'),
          value: await getText('.echMetricText__valueBlock'),
          color: await getColor('.echMetric'),
          trendlineColor: await (async () => {
            const el = tile.locator('.echSingleMetricSparkline__svg > rect');
            if ((await el.count()) === 0) return undefined;
            return (await el.getAttribute('fill')) ?? undefined;
          })(),
          showingTrendline: (await tile.locator('.echSingleMetricSparkline').count()) > 0,
          showingBar,
        });
      }

      return data;
    }

    /** Returns the visible text of the secondary-value trend badge, or `undefined` if absent. */
    async getSecondaryMetricBadgeText(): Promise<string | undefined> {
      if ((await this.secondaryMetricBadge.count()) === 0) {
        return undefined;
      }
      return (await this.secondaryMetricBadge.innerText()).trim();
    }

    /**
     * Returns the secondary-value trend badge locator, so callers can assert its presence or
     * background color with `toHaveCount` / `toHaveCSS` (both auto-retry until the debounced
     * update settles).
     */
    getSecondaryMetricBadgeLocator() {
      return this.secondaryMetricBadge;
    }

    /** Returns the secondary metric's label text, or `undefined` if not rendered. */
    async getSecondaryMetricLabel(): Promise<string | undefined> {
      if ((await this.secondaryMetricLabel.count()) === 0) {
        return undefined;
      }
      return (await this.secondaryMetricLabel.innerText()).trim();
    }

    /** Returns the title and value rendered by a legacy metric visualization. */
    async getLegacyMetricData(): Promise<{ title: string; value: string }> {
      return {
        title: await this.page.testSubj.innerText('metric_label'),
        value: await this.page.testSubj.innerText('metric_value'),
      };
    }

    /** Clicks the legacy metric label (used to create a filter). */
    async clickLegacyMetric() {
      await this.page.testSubj.click('metric_label');
    }

    /** Sets the legacy metric dynamic coloring mode. */
    async setLegacyMetricColoringMode(mode: 'none' | 'labels' | 'background') {
      await this.page.testSubj.click(`lnsLegacyMetric_dynamicColoring_groups_${mode}`);
    }

    /**
     * Locator for the legacy metric value element. Prefer asserting its computed
     * color with `expect(...).toHaveCSS('color', ...)` over `getLegacyMetricStyle()`
     * when checking a color that was just changed — coloring updates are debounced,
     * so a point-in-time read of the `style` attribute can race the update, while
     * `toHaveCSS` auto-retries until the color settles.
     */
    getLegacyMetricValueLocator() {
      return this.legacyMetricValue;
    }

    /** Parses the inline `style` attribute of the legacy metric value element into a map. */
    async getLegacyMetricStyle(): Promise<Record<string, string>> {
      return parseInlineStyle((await this.legacyMetricValue.getAttribute('style')) ?? '');
    }
  };
}
