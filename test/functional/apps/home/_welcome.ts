/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'home']);

  describe('Welcome interstitial', () => {
    before(async () => {
      // Need to navigate to page first to clear storage before test can be run
      await PageObjects.common.navigateToUrl('home', undefined);
      await browser.clearLocalStorage();
      await esArchiver.emptyKibanaIndex();
    });

    it('is displayed on a fresh on-prem install', async () => {
      await PageObjects.common.navigateToUrl('home', undefined, { disableWelcomePrompt: false });
      expect(await PageObjects.home.isWelcomeInterstitialDisplayed()).to.be(true);
    });
  });
}
