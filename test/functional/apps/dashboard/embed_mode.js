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

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['dashboard', 'common']);
  const browser = getService('browser');

  describe('embed mode', async () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('hides the chrome', async () => {
      let isChromeVisible = await PageObjects.common.isChromeVisible();
      expect(isChromeVisible).to.be(true);

      const currentUrl = await browser.getCurrentUrl();
      const newUrl = currentUrl + '&embed=true';
      // Embed parameter only works on a hard refresh.
      const useTimeStamp = true;
      await browser.get(newUrl.toString(), useTimeStamp);

      await retry.try(async () => {
        isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(false);
      });
    });

    after(async function () {
      const currentUrl = await browser.getCurrentUrl();
      const newUrl = currentUrl.replace('&embed=true', '');
      // First use the timestamp to cause a hard refresh so the new embed parameter works correctly.
      let useTimeStamp = true;
      await browser.get(newUrl.toString(), useTimeStamp);
      // Then get rid of the timestamp so the rest of the tests work with state and app switching.
      useTimeStamp = false;
      await browser.get(newUrl.toString(), useTimeStamp);
    });
  });
}

