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

import expect from 'expect.js';

import { FtrProviderContext } from '../../ftr_provider_context';

// tslint:disable-next-line no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize']);
  const appsMenu = getService('appsMenu');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');

  // get the url from the browser, other methods standardize encoding but we want raw encoding from browser
  function getRawBrowserUrl() {
    return window.location.href;
  }

  // prevent old lastUrl's from mucking up our navigation
  function resetSessionStorage() {
    window.sessionStorage.clear();
  }

  describe.only('back button', function describeIndexTests() {
    before(async () => {
      await esArchiver.load('makelogs');
      await esArchiver.load('navigation/basic');

      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('home');
      await browser.execute(resetSessionStorage);
      await PageObjects.common.navigateToApp('home');
    });

    // Detects bug described in issue #31238 - where back navigation would get stuck to URL encoding handling in Angular.
    it('works after clicking link with strong url encoding in hash of href', async () => {
      // Navigate to discover app
      await appsMenu.clickLink('Dashboard');
      await PageObjects.dashboard.loadSavedDashboard('New Dashboard');
      await retry.waitFor(
        'some dashboard panels to render',
        async () => (await PageObjects.dashboard.getPanelCount()) > 0
      );

      // Assert that url has decoded version of the url
      expect(await browser.execute(getRawBrowserUrl)).to.contain(`description:''`);

      // Navigate to visualize app via app link
      await appsMenu.clickLink('Visualize');
      await retry.waitFor(
        'visualize landing page loaded',
        async () => await PageObjects.visualize.onLandingPage()
      );

      // Verify that dashboard app link has **strongly** encoded url
      expect(await appsMenu.getHref('Dashboard')).to.contain('description%3A%27%27');

      // Navigating back to dashboard by clicking the app link
      await appsMenu.clickLink('Dashboard');
      await retry.waitFor(
        'some dashboard panels to render',
        async () => (await PageObjects.dashboard.getPanelCount()) > 0
      );

      // Use the back button to get back to visualize
      await browser.goBack();
      await retry.waitFor(
        'visualize landing page loaded',
        async () => await PageObjects.visualize.onLandingPage()
      );
    });

    it('encodes portions of the URL as necessary', async () => {
      await browser.get('http://localhost:5620/app/kibana#/home', false);
      await retry.waitFor(
        'navigation to home app',
        async () =>
          (await browser.execute(getRawBrowserUrl)) ===
          'http://localhost:5620/app/kibana#/home?_g=()'
      );

      await browser.get('http://localhost:5620/app/kibana#/home?_g=()&a=b/c', false);
      await retry.waitFor(
        'hash to be properly encoded',
        async () =>
          (await browser.execute(getRawBrowserUrl)) ===
          'http://localhost:5620/app/kibana#/home?_g=()&a=b%2Fc'
      );
    });
  });
}
