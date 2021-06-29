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
  const PageObjects = getPageObjects(['common', 'header', 'home', 'timePicker']);
  const appsMenu = getService('appsMenu');
  const esArchiver = getService('esArchiver');

  describe('Kibana browser back navigation should work', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/discover');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('detect navigate back issues', async () => {
      let currUrl;
      // Detects bug described in issue #31238 - where back navigation would get stuck to URL encoding handling in Angular.
      // Navigate to home app
      await PageObjects.common.navigateToApp('home');
      const homeUrl = await browser.getCurrentUrl();

      // Navigate to discover app
      await appsMenu.clickLink('Discover');
      const discoverUrl = await browser.getCurrentUrl();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      const modifiedTimeDiscoverUrl = await browser.getCurrentUrl();

      // Navigate to dashboard app
      await appsMenu.clickLink('Dashboard');

      // Navigating back to discover
      await browser.goBack();
      currUrl = await browser.getCurrentUrl();
      expect(currUrl).to.be(modifiedTimeDiscoverUrl);

      // Navigating back from time settings
      await browser.goBack(); // undo time settings
      currUrl = await browser.getCurrentUrl();
      expect(currUrl.startsWith(discoverUrl)).to.be(true);

      // Navigate back home
      await browser.goBack();
      currUrl = await browser.getCurrentUrl();
      expect(currUrl).to.be(homeUrl);
    });
  });
}
