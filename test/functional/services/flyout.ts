/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function FlyoutProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');

  class Flyout {
    public async close(dataTestSubj: string): Promise<void> {
      log.debug('Closing flyout', dataTestSubj);
      const flyoutElement = await testSubjects.find(dataTestSubj);
      const closeBtn = await flyoutElement.findByCssSelector('[aria-label*="Close"]');
      await closeBtn.click();
      await retry.waitFor(
        'flyout closed',
        async () => !(await testSubjects.exists(dataTestSubj, { timeout: 1000 }))
      );
    }

    public async ensureClosed(dataTestSubj: string): Promise<void> {
      if (await testSubjects.exists(dataTestSubj, { timeout: 1000 })) {
        await this.close(dataTestSubj);
      }
    }

    public async ensureAllClosed(): Promise<void> {
      const flyoutElements = await find.allByCssSelector('.euiFlyout');

      if (!flyoutElements.length) {
        return;
      }

      for (let i = 0; i < flyoutElements.length; i++) {
        const closeBtn = await flyoutElements[i].findByCssSelector('[aria-label*="Close"]');
        await closeBtn.click();
      }

      await retry.waitFor(
        'all flyouts to be closed',
        async () => (await find.allByCssSelector('.euiFlyout')).length === 0
      );
    }
  }

  return new Flyout();
}
