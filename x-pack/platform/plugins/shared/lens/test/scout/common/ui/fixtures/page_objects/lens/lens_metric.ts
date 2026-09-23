/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { normalizeComputedColor, parseInlineStyle } from './lens_editor_helpers';

/**
 * Elastic Charts metric tiles and legacy metric visualization helpers.
 */
export class LensMetric {
  // Elastic Charts pads the last grid row with empty filler cells (`role="presentation"`,
  // no title/value) to keep tile sizing consistent; excluded since they aren't real metrics.
  // Scope Elastic Charts class selectors to the metric workspace so chrome/other
  // panels with the same classes can't produce false positives.
  readonly metricTilesLocator;
  readonly secondaryMetricBadge;
  private readonly secondaryMetricLabel;
  private readonly secondaryMetric;
  /** Name tooltip shown on hover when the secondary metric name display is set to `tooltip`. */
  readonly secondaryMetricNameTooltip;
  /**
   * Added in a render pass after the one `waitForVisualization` settles on — callers that need
   * to assert it appears should poll `count()` before snapshotting via `getMetricVisualizationData`.
   */
  readonly metricProgressBar;
  readonly legacyMetricLabel;
  readonly legacyMetricValue;
  readonly trendline;

  constructor(private readonly page: ScoutPage) {
    this.metricTilesLocator = this.metricTiles();
    this.secondaryMetricBadge = this.metricRoot().locator('.echBadge__content');
    this.secondaryMetricLabel = this.metricRoot().locator('.echSecondaryMetric__label');
    this.secondaryMetric = this.metricRoot().locator('.echSecondaryMetric');
    this.secondaryMetricNameTooltip = this.page.testSubj.locator('mtrVisSecondaryNameTooltip');
    this.metricProgressBar = this.progressBar();
    this.legacyMetricLabel = this.page.testSubj.locator('metric_label');
    this.legacyMetricValue = this.page.testSubj.locator('metric_value');
    this.trendline = this.metricRoot().locator('.echSingleMetricSparkline');
  }

  /** Root `[data-test-subj="mtrVis"]` locator, optionally limited to a dashboard panel. */
  private metricRoot(scope?: Locator): Locator {
    return (scope ?? this.page).locator('[data-test-subj="mtrVis"]');
  }

  /** Metric tiles currently rendered, optionally limited to a dashboard panel. */
  metricTiles(scope?: Locator): Locator {
    return this.metricRoot(scope).locator('.echChart li:not([role="presentation"])');
  }

  /**
   * Progress bar for the metric vis, optionally limited to a dashboard panel. Lands in a render
   * pass after `waitForVisualization`; wait on this locator before snapshotting tile data.
   */
  progressBar(scope?: Locator): Locator {
    return this.metricRoot(scope).locator('.echSingleMetricProgress');
  }

  /** Returns locators for each Elastic Charts metric tile currently rendered. */
  getMetricTiles(scope?: Locator) {
    return this.metricTiles(scope).all();
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
   * Reads the current state of every metric tile inside `[data-test-subj="mtrVis"]`.
   * Pass `scope` (e.g. a dashboard panel locator) when multiple metric visualizations are on the page.
   */
  async getMetricVisualizationData(scope?: Locator) {
    const tiles = await this.getMetricTiles(scope);
    const showingBar = (await this.progressBar(scope).count()) > 0;

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

  /** Hovers the secondary metric, which reveals its name tooltip in `tooltip` name display mode. */
  async hoverSecondaryMetric() {
    await this.secondaryMetric.hover();
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
   * Parses the inline `style` attribute of the legacy metric value element into a map.
   * Prefer asserting `legacyMetricValue` color with `expect(...).toHaveCSS('color', ...)`
   * over this helper when checking a color that was just changed — coloring updates are
   * debounced, so a point-in-time read of the `style` attribute can race the update, while
   * `toHaveCSS` auto-retries until the color settles.
   */
  async getLegacyMetricStyle(): Promise<Record<string, string>> {
    return parseInlineStyle((await this.legacyMetricValue.getAttribute('style')) ?? '');
  }
}
