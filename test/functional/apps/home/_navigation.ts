/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header', 'home', 'timePicker']);
  const appsMenu = getService('appsMenu');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('Kibana browser back navigation should work', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      if (browser.isInternetExplorer) {
        await kibanaServer.uiSettings.replace({ 'state:storeInSessionStorage': false });
      }
    });

    after(async () => {
      if (browser.isInternetExplorer) {
        await kibanaServer.uiSettings.replace({ 'state:storeInSessionStorage': true });
      }
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
