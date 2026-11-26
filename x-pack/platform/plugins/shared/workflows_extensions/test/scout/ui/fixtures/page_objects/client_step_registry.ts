/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Reads the browser-side step registry through the test bridge installed by the
 * `workflowsExtensions` public plugin (see `public/test_bridge.ts`).
 */
export class ClientStepRegistry {
  constructor(private readonly page: ScoutPage) {}

  /** Loads Kibana and waits for the test bridge. Every browser plugin starts on page load, so any app works. */
  async goto(): Promise<void> {
    await this.page.gotoApp('management');
    await this.page.waitForFunction(() => window.__workflowsExtensionsTestBridge !== undefined);
  }

  /** Returns the ids of all steps registered on the client, once every async loader has settled. */
  async getStepDefinitionIds(): Promise<string[]> {
    return this.page.evaluate(() => {
      const bridge = window.__workflowsExtensionsTestBridge;
      if (!bridge) {
        throw new Error('The workflowsExtensions test bridge is not installed on window');
      }
      return bridge.getStepDefinitionIds();
    });
  }
}
