/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
// Import from the specific action file (not the `actions` barrel) so we keep
// compile-time coupling to the production id without pulling the barrel's
// React/EUI action modules into the Node-side Playwright config load.
import { OPEN_IN_DISCOVER_EPISODE_ACTION_ID } from '@kbn/alerting-v2-episodes-ui/actions/open_in_discover';

/**
 * Drives the Alerts (episodes) list page. Episode row actions are rendered as
 * UnifiedDataTable leading controls: read-only users only get the read-safe
 * "Open in Discover" inline control, while editors get enough write actions
 * that they collapse into the overflow actions menu.
 */
export class AlertEpisodesListPage {
  public readonly pageContainer: Locator;
  public readonly tableToolbar: Locator;
  public readonly itemCount: Locator;
  public readonly kpisAlertsPanel: Locator;
  public readonly kpisAlertActionsPanel: Locator;
  public readonly histogramPanel: Locator;
  public readonly histogramChart: Locator;
  public readonly tagsFilterButton: Locator;
  public readonly tagsFilterSearch: Locator;
  /** Inline "Open in Discover" leading control (the only read-safe episode action). */
  public readonly openInDiscoverRowControl: Locator;
  /**
   * Overflow row actions ("Additional actions") menu. Episode actions are
   * wrapped in the UnifiedDataTable "actions" control column, so the overflow
   * button is `unifiedDataTable_additionalRowControl_actionsMenu`. It only
   * appears when more mutating actions are available than fit inline (editors).
   */
  public readonly rowActionsMenuButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageContainer = this.page.testSubj.locator('alertingV2EpisodesListPage');
    this.tableToolbar = this.page.testSubj.locator('unifiedDataTableToolbar');
    this.itemCount = this.page.testSubj.locator('alertEpisodesItemCount');
    this.kpisAlertsPanel = this.page.testSubj.locator('episodesKpisAlertsPanel');
    this.kpisAlertActionsPanel = this.page.testSubj.locator('episodesKpisAlertActionsPanel');
    this.histogramPanel = this.page.testSubj.locator('episodesHistogramPanel');
    this.histogramChart = this.page.testSubj.locator('unifiedHistogramChart');
    this.tagsFilterButton = this.page.testSubj.locator('episodesFilterBar-tags-button');
    this.tagsFilterSearch = this.page.getByPlaceholder('Search alert tags…');
    this.openInDiscoverRowControl = this.page.testSubj.locator(
      `unifiedDataTable_rowControl_${OPEN_IN_DISCOVER_EPISODE_ACTION_ID}`
    );
    this.rowActionsMenuButton = this.page.testSubj.locator(
      'unifiedDataTable_additionalRowControl_actionsMenu'
    );
  }

  async goto() {
    await this.page.gotoApp('management/alertingV2/episodes');
  }

  async openTagsFilter(): Promise<void> {
    await this.tagsFilterButton.click();
    // The listbox role is absent when there are no tag options; the search
    // field is the popover's stable mount signal.
    await this.tagsFilterSearch.waitFor({ state: 'visible' });
  }

  async searchTagsFilter(query: string): Promise<void> {
    await this.tagsFilterSearch.fill(query);
  }

  tagFilterOption(tag: string): Locator {
    return this.page.testSubj.locator(`episodesFilterBar-tags-popover-option-${tag}`);
  }
}
