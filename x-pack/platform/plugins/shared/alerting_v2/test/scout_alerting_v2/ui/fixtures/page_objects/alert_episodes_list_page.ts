/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Id of the read-safe "Open in Discover" episode action. Kept in sync with
 * `OPEN_IN_DISCOVER_EPISODE_ACTION_ID` in `@kbn/alerting-v2-episodes-ui`.
 */
const OPEN_IN_DISCOVER_EPISODE_ACTION_ID = 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER';

/**
 * Drives the Alerts (episodes) list page. Episode row actions are rendered as
 * UnifiedDataTable leading controls: read-only users only get the read-safe
 * "Open in Discover" inline control, while editors get enough write actions
 * that they collapse into the overflow actions menu.
 */
export class AlertEpisodesListPage {
  public readonly pageContainer: Locator;
  public readonly itemCount: Locator;
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
    this.itemCount = this.page.testSubj.locator('alertEpisodesItemCount');
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
}
