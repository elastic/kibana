/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EmbeddingProvider({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const PageObjects = getPageObjects(['header']);

  class Embedding {
    /**
     * Opens current page in embeded mode
     */
    public async openInEmbeddedMode(): Promise<void> {
      const currentUrl = await browser.getCurrentUrl();
      log.debug(`Opening in embedded mode: ${currentUrl}`);
      await browser.get(`${currentUrl}&embed=true`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }
  }

  return new Embedding();
}
