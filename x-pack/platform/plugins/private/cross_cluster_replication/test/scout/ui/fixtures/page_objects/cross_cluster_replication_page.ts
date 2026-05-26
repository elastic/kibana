/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const CCR_FOLLOWER_INDICES_PATH = 'management/data/cross_cluster_replication/follower_indices';

export class CrossClusterReplicationPage {
  readonly appTitle;
  readonly followerIndicesTab;
  readonly autoFollowPatternsTab;
  readonly createFollowerIndexButton;
  readonly createAutoFollowPatternButton;
  readonly emptyPrompt;

  constructor(private readonly page: ScoutPage) {
    this.appTitle = page.testSubj.locator('appTitle');
    this.followerIndicesTab = page.testSubj.locator('followerIndicesTab');
    this.autoFollowPatternsTab = page.testSubj.locator('autoFollowPatternsTab');
    this.createFollowerIndexButton = page.testSubj.locator('createFollowerIndexButton');
    this.createAutoFollowPatternButton = page.testSubj.locator('createAutoFollowPatternButton');
    this.emptyPrompt = page.testSubj.locator('emptyPrompt');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(CCR_FOLLOWER_INDICES_PATH);
    // The follower indices list issues a CCR stats request on load; wait for the
    // empty prompt to render before asserting page content.
    await this.emptyPrompt.waitFor({ state: 'visible', timeout: 30000 });
  }

  async openAutoFollowPatternsTab(): Promise<void> {
    await this.autoFollowPatternsTab.click();
  }
}
