/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Each Scout test gets a fresh browser context, so the inspector always opens
 * on its default "Requests" view — unlike FTR, which reuses one long-lived
 * browser session and must defensively re-select the view per suite.
 */
export class Inspector {
  public readonly panel: Locator;
  public readonly closeButton: Locator;

  public readonly requests: {
    readonly timestamp: Locator;
    readonly hits: Locator;
  };

  constructor(private readonly page: ScoutPage) {
    this.panel = page.testSubj.locator('inspectorPanel');
    this.closeButton = page.testSubj.locator('euiFlyoutCloseButton');

    this.requests = {
      timestamp: page.testSubj.locator('inspector.statistics.requestTimestamp'),
      hits: page.testSubj.locator('inspector.statistics.hits'),
    };
  }

  private async open() {
    await this.page.testSubj.click('openInspectorButton');
    await this.panel.waitFor({ state: 'visible' });
  }

  private async close() {
    await this.closeButton.click();
    await this.panel.waitFor({ state: 'hidden' });
  }

  async getRequestTimestamp(): Promise<string> {
    await this.open();
    const timestamp = await this.requests.timestamp.innerText();
    await this.close();
    return timestamp;
  }

  async getHits(): Promise<string> {
    await this.open();
    const hits = await this.requests.hits.innerText();
    await this.close();
    return hits;
  }
}
