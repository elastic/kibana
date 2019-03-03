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


export default function ({ getService, getPageObjects }) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['dashboard', 'common', 'home', 'timePicker']);
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('Kibana browser back navigation should work', function describeIndexTests() {

    before(async () => {
      await PageObjects.dashboard.initTests();
      await kibanaServer.uiSettings.disableToastAutohide();
      await browser.refresh();
    });

    it('detect navigate back issues', async ()=> {
      // Detect bug described in issue #31238 - where back navigation would get stuck to URL encoding handling in Angular.
      await PageObjects.common.navigateToApp('home');
      const prevUrl = await browser.getCurrentUrl();
      await appsMenu.clickLink('Discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await appsMenu.clickLink('Dashboard');
      await browser.goBack(); // go back to discover
      await browser.goBack(); // undo time settings
      await browser.goBack(); // undo automatically set config, should it be in the history stack? (separate issue!)
      await browser.goBack(); // go home
      const url = await browser.getCurrentUrl();
      expect(url).to.be(prevUrl);
    });
  });

}
