/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner } from '@kbn/onechat-server';

/**
 * Service holder for onechat workflow step types.
 * This allows step handlers to access onechat services that are only available at start time.
 */
class OnechatStepServices {
  private runner: Runner | undefined;

  /**
   * Set the runner service. Called during plugin start.
   */
  setRunner(runner: Runner): void {
    this.runner = runner;
  }

  /**
   * Get the runner service. Throws if not initialized.
   */
  getRunner(): Runner {
    if (!this.runner) {
      throw new Error('Onechat runner service not initialized. Ensure the plugin has started.');
    }
    return this.runner;
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this.runner !== undefined;
  }
}

// Singleton instance
export const onechatStepServices = new OnechatStepServices();
