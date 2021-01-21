/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const browser = getService('browser');
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['common', 'header', 'home']);

  describe('Kibana takes you home', function describeIndexTests() {
    this.tags('includeFirefox');

    it('clicking on kibana logo should take you to home page', async () => {
      await PageObjects.common.navigateToApp('settings');
      await globalNav.clickLogo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const url = await browser.getCurrentUrl();
      expect(url.includes('/app/home')).to.be(true);
    });

    it('clicking on console on homepage should take you to console app', async () => {
      await PageObjects.home.clickSynopsis('console');
      const url = await browser.getCurrentUrl();
      expect(url.includes('/app/dev_tools#/console')).to.be(true);
    });
  });
}
