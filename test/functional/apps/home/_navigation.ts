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
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header', 'home', 'timePicker']);
  const appsMenu = getService('appsMenu');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  const getHost = () => {
    if (process.env.TEST_KIBANA_HOSTNAME) {
      return process.env.TEST_KIBANA_HOSTNAME;
    } else if (process.env.TEST_KIBANA_HOST) {
      return process.env.TEST_KIBANA_HOST;
    } else {
      return 'localhost';
    }
  };

  const getBasePath = () => {
    if (process.env.TEST_KIBANA_URL) {
      const myURL = new URL(process.env.TEST_KIBANA_URL);
      return `${myURL.protocol}//${myURL.host}`;
    }
    const protocol = process.env.TEST_KIBANA_PROTOCOL || 'http';
    const host = getHost();
    const port = process.env.TEST_KIBANA_PORT || '5620';
    return `${protocol}://${host}:${port}`;
  };

  describe('Kibana browser back navigation should work', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('discover');
      await esArchiver.loadIfNeeded('makelogs');
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
      await browser.goBack(); // undo automatically set config, should it be in the history stack? (separate issue!)
      currUrl = await browser.getCurrentUrl();
      // Discover view also keeps adds some default arguments into the _a URL parameter, so we can only check that the url starts the same.
      expect(currUrl.startsWith(discoverUrl)).to.be(true);

      // Navigate back home
      await browser.goBack();
      currUrl = await browser.getCurrentUrl();
      expect(currUrl).to.be(homeUrl);
    });

    it('encodes portions of the URL as necessary', async () => {
      await PageObjects.common.navigateToApp('home');
      const basePath = getBasePath();
      await browser.get(`${basePath}/app/kibana#/home`, false);
      await retry.waitFor(
        'navigation to home app',
        async () => (await browser.getCurrentUrl()) === `${basePath}/app/kibana#/home`
      );

      await browser.get(`${basePath}/app/kibana#/home?_g=()&a=b/c`, false);
      await retry.waitFor(
        'hash to be properly encoded',
        async () => (await browser.getCurrentUrl()) === `${basePath}/app/kibana#/home?_g=()&a=b%2Fc`
      );
    });
  });
}
