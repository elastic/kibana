/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class CrossClusterReplicationPage {
  readonly appTitle: Locator;
  readonly createFollowerIndexButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.appTitle = this.page.testSubj.locator('appTitle');
    this.createFollowerIndexButton = this.page.testSubj.locator('createFollowerIndexButton');
  }

  async goto() {
    await this.page.gotoApp('management/data/cross_cluster_replication');
    await this.appTitle.waitFor();
  }
}
