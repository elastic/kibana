/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { Locator, ScoutPage } from '@kbn/scout';

const CCR_FOLLOWER_INDICES_PATH = 'management/data/cross_cluster_replication/follower_indices';
const CCR_AUTO_FOLLOW_PATTERNS_PATH =
  'management/data/cross_cluster_replication/auto_follow_patterns';
const CCR_CREATE_FOLLOWER_PATH = 'management/data/cross_cluster_replication/follower_indices/add';
const CCR_CREATE_AUTO_FOLLOW_PATH =
  'management/data/cross_cluster_replication/auto_follow_patterns/add';

// The follower index detail flyout fetches per-shard CCR stats when it opens, which
// can exceed the default action timeout (10s), so that wait opts into a longer one.
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
    this.appTitle = page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
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

  // Every route waits on the permissions check before it renders, and then on its own
  // request (CCR stats, auto-follow patterns or remote clusters). Gating the navigation on
  // the element behind those requests gives the whole app boot one ready timeout.
  async goto(): Promise<void> {
    await this.page.gotoApp(CCR_FOLLOWER_INDICES_PATH, { readyWhen: this.emptyPrompt });
  }

  async gotoFollowerIndicesList(): Promise<void> {
    await this.page.gotoApp(CCR_FOLLOWER_INDICES_PATH, {
      readyWhen: this.followerIndexListTable,
    });
  }

  async gotoAutoFollowPatternsList(): Promise<void> {
    await this.page.gotoApp(CCR_AUTO_FOLLOW_PATTERNS_PATH, {
      readyWhen: this.autoFollowPatternListTable,
    });
  }

  async gotoCreateFollowerIndex(): Promise<void> {
    await this.page.gotoApp(CCR_CREATE_FOLLOWER_PATH, { readyWhen: this.followerIndexForm });
  }

  async gotoCreateAutoFollowPattern(): Promise<void> {
    await this.page.gotoApp(CCR_CREATE_AUTO_FOLLOW_PATH, {
      readyWhen: this.autoFollowPatternForm,
    });
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
