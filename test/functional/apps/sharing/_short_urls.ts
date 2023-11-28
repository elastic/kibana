/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Short URLs', () => {
    it('opening a missing short URL shows empty prompt', async () => {
      await PageObjects.common.navigateToApp('home');

      log.info('Navigating to Home...');
      await retry.try(async () => {
        const title = await browser.getTitle();
        expect(title).to.be('Home - Elastic');
      });

      log.info('Changing URL to missing short URL...');
      const currentUrl = await browser.getCurrentUrl();
      const newUrl = currentUrl.replace(/\/app\/home/, '/app/r/s/foofoo');
      await browser.get(newUrl);

      await retry.try(async () => {
        await testSubjects.existOrFail('redirectErrorEmptyPromptBody');
      });

      log.info('Clicking the prompt button...');
      await testSubjects.click('redirectErrorEmptyPromptButton');

      await retry.try(async () => {
        const title = await browser.getTitle();
        expect(title).to.be('Home - Elastic');
      });
    });
  });
}
