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
  describe('Short URLs', () => {
    const PageObjects = getPageObjects(['common']);
    const browser = getService('browser');
    const log = getService('log');
    const testSubjects = getService('testSubjects');
    const retry = getService('retry');

    it('shows Page for missing short URL', async () => {
      await PageObjects.common.navigateToApp('home');

      // go to 404
      const currentUrl = await browser.getCurrentUrl();
      log.info('Changing URL to missing short URL...');
      const newUrl = currentUrl.replace(/\/app\/home/, '/app/r/s/foofoo');
      await browser.get(newUrl);

      // check the page for 404 contents
      log.info('Checking page title...');
      await retry.try(async () => {
        const title = await browser.getTitle();
        expect(title).to.be('Not Found - Elastic');
      });

      await retry.try(async () => {
        await testSubjects.existOrFail('redirectErrorEmptyPromptBody');
      });

      // click "back to home" button
      log.info('Clicking the prompt button...');
      await testSubjects.click('redirectErrorEmptyPromptButton');

      // check the page
      await retry.try(async () => {
        const title = await browser.getTitle();
        expect(title).to.be('Home - Elastic');
      });
    });
  });
}
