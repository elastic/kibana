/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class AlertEpisodesListPage {
  /** Root page wrapper */
  public readonly pageRoot: Locator;

  /** Filter bar search input */
  public readonly filterBarSearch: Locator;

  /**
   * The EuiPanel wrapping the EpisodesHistogram component.
   * Becomes visible once EpisodesHistogram mounts.
   */
  public readonly histogramContainer: Locator;

  /**
   * The canvas/SVG element that Elastic Charts renders inside the histogram.
   * Rendered when the chart has finished painting at least one frame.
   */
  public readonly histogramChart: Locator;

  /** Breakdown field selector inside the unified histogram toolbar */
  public readonly histogramBreakdownSelector: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageRoot = this.page.testSubj.locator('alertingV2EpisodesListPage');
    this.filterBarSearch = this.page.testSubj.locator('episodesFilterBar-search');
    this.histogramContainer = this.page.testSubj.locator('episodesHistogramPanel');
    this.histogramChart = this.page.testSubj.locator('unifiedHistogramChart');
    this.histogramBreakdownSelector = this.page.testSubj.locator(
      'unifiedHistogramBreakdownSelector'
    );
  }

  async goto() {
    await this.page.gotoApp('management/alertingV2/episodes');
  }
}
