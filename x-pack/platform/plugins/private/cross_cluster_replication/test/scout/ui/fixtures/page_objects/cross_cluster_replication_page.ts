/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const CCR_FOLLOWER_INDICES_PATH = 'management/data/cross_cluster_replication/follower_indices';
const CCR_AUTO_FOLLOW_PATTERNS_PATH =
  'management/data/cross_cluster_replication/auto_follow_patterns';
const CCR_CREATE_FOLLOWER_PATH = 'management/data/cross_cluster_replication/follower_indices/add';
const CCR_CREATE_AUTO_FOLLOW_PATH =
  'management/data/cross_cluster_replication/auto_follow_patterns/add';

// The follower-index list and detail views issue a CCR stats request on load,
// which can exceed the default action timeout; only those waits need to opt into
// a longer timeout. Everything else relies on Scout's default (10s).
const CCR_STATS_WAIT_TIMEOUT = 30_000;

export class CrossClusterReplicationPage {
  readonly appTitle;
  readonly followerIndicesTab;
  readonly autoFollowPatternsTab;
  readonly createFollowerIndexButton;
  readonly createAutoFollowPatternButton;
  readonly emptyPrompt;
  readonly followerIndexForm;
  readonly autoFollowPatternForm;
  readonly followerIndexListTable;
  readonly autoFollowPatternListTable;
  readonly followerIndexDetailFlyout;
  readonly autoFollowPatternDetailFlyout;
  readonly closeFlyoutButton;

  constructor(private readonly page: ScoutPage) {
    this.appTitle = page.testSubj.locator('appTitle');
    this.followerIndicesTab = page.testSubj.locator('followerIndicesTab');
    this.autoFollowPatternsTab = page.testSubj.locator('autoFollowPatternsTab');
    this.createFollowerIndexButton = page.testSubj.locator('createFollowerIndexButton');
    this.createAutoFollowPatternButton = page.testSubj.locator('createAutoFollowPatternButton');
    this.emptyPrompt = page.testSubj.locator('emptyPrompt');
    this.followerIndexForm = page.testSubj.locator('followerIndexForm');
    this.autoFollowPatternForm = page.testSubj.locator('autoFollowPatternForm');
    this.followerIndexListTable = page.testSubj.locator('followerIndexListTable');
    this.autoFollowPatternListTable = page.testSubj.locator('autoFollowPatternListTable');
    this.followerIndexDetailFlyout = page.testSubj.locator('followerIndexDetail');
    this.autoFollowPatternDetailFlyout = page.testSubj.locator('autoFollowPatternDetail');
    this.closeFlyoutButton = page.testSubj.locator('closeFlyoutButton');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(CCR_FOLLOWER_INDICES_PATH);
    // The follower indices list issues a CCR stats request on load; wait for the
    // empty prompt to render before asserting page content.
    await this.emptyPrompt.waitFor({ state: 'visible', timeout: CCR_STATS_WAIT_TIMEOUT });
  }

  async gotoFollowerIndicesList(): Promise<void> {
    await this.page.gotoApp(CCR_FOLLOWER_INDICES_PATH);
    await this.followerIndexListTable.waitFor({
      state: 'visible',
      timeout: CCR_STATS_WAIT_TIMEOUT,
    });
  }

  async gotoAutoFollowPatternsList(): Promise<void> {
    await this.page.gotoApp(CCR_AUTO_FOLLOW_PATTERNS_PATH);
    await this.autoFollowPatternListTable.waitFor();
  }

  async gotoCreateFollowerIndex(): Promise<void> {
    await this.page.gotoApp(CCR_CREATE_FOLLOWER_PATH);
    await this.followerIndexForm.waitFor();
  }

  async gotoCreateAutoFollowPattern(): Promise<void> {
    await this.page.gotoApp(CCR_CREATE_AUTO_FOLLOW_PATH);
    await this.autoFollowPatternForm.waitFor();
  }

  async openAutoFollowPatternsTab(): Promise<void> {
    await this.autoFollowPatternsTab.click();
  }

  // The list links share a single `data-test-subj`, so disambiguate by visible text.
  followerIndexLink(name: string): Locator {
    return this.page.testSubj.locator('followerIndexLink').filter({ hasText: name });
  }

  autoFollowPatternLink(name: string): Locator {
    return this.page.testSubj.locator('autoFollowPatternLink').filter({ hasText: name });
  }

  async openFollowerIndexDetail(name: string): Promise<void> {
    await this.followerIndexLink(name).click();
    // The follower detail flyout fetches per-shard stats, so it can be slower.
    await this.followerIndexDetailFlyout.waitFor({
      state: 'visible',
      timeout: CCR_STATS_WAIT_TIMEOUT,
    });
  }

  async openAutoFollowPatternDetail(name: string): Promise<void> {
    await this.autoFollowPatternLink(name).click();
    await this.autoFollowPatternDetailFlyout.waitFor();
  }

  async closeFlyout(): Promise<void> {
    await this.closeFlyoutButton.click();
  }
}
