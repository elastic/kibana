/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

const ANALYTICS_LOCAL_STORAGE_KEY = 'analytics';

export class UsageCollectionService extends FtrService {
  private readonly browser = this.ctx.getService('browser');

  public async getUICounterEvents(): Promise<
    Array<{
      key: string;
      appName: string;
      eventName: string;
      type: string;
      total: number;
    }>
  > {
    try {
      const rawValue = await this.browser.getLocalStorageItem(ANALYTICS_LOCAL_STORAGE_KEY);

      if (rawValue) {
        const { uiCounter } = JSON.parse(rawValue) ?? {};

        return Object.values(uiCounter);
      }
    } catch (e) {
      // nothing to be here
    }
    return [];
  }
}
