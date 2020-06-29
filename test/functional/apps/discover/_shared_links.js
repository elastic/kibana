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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'share', 'timePicker']);
  const browser = getService('browser');

  describe('shared links', function describeIndexTests() {
    let baseUrl;

    async function setup({ storeStateInSessionStorage }) {
      baseUrl = PageObjects.common.getHostPort();
      log.debug('baseUrl = ' + baseUrl);
      // browsers don't show the ':port' if it's 80 or 443 so we have to
      // remove that part so we can get a match in the tests.
      baseUrl = baseUrl.replace(':80', '').replace(':443', '');
      log.debug('New baseUrl = ' + baseUrl);

      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');

      await kibanaServer.uiSettings.replace({
        'state:storeInSessionStorage': storeStateInSessionStorage,
      });

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      await PageObjects.timePicker.setDefaultAbsoluteRange();

      //After hiding the time picker, we need to wait for
      //the refresh button to hide before clicking the share button
      await PageObjects.common.sleep(1000);

      await PageObjects.share.clickShareTopNavButton();

      return async () => {
        await kibanaServer.uiSettings.replace({
          'state:storeInSessionStorage': undefined,
        });
      };
    }

    describe('shared links with state in query', async () => {
      let teardown;
      before(async function () {
        teardown = await setup({ storeStateInSessionStorage: false });
      });

      after(async function () {
        await teardown();
      });

      describe('permalink', function () {
        it('should allow for copying the snapshot URL', async function () {
          const expectedUrl =
            baseUrl +
            '/app/discover?_t=1453775307251#' +
            '/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time' +
            ":(from:'2015-09-19T06:31:44.000Z',to:'2015-09" +
            "-23T18:31:44.000Z'))&_a=(columns:!(_source),filters:!(),index:'logstash-" +
            "*',interval:auto,query:(language:kuery,query:'')" +
            ',sort:!())';
          const actualUrl = await PageObjects.share.getSharedUrl();
          // strip the timestamp out of each URL
          expect(actualUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')).to.be(
            expectedUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')
          );
        });

        it('should allow for copying the snapshot URL as a short URL', async function () {
          const re = new RegExp(baseUrl + '/goto/[0-9a-f]{32}$');
          await PageObjects.share.checkShortenUrl();
          await retry.try(async () => {
            const actualUrl = await PageObjects.share.getSharedUrl();
            expect(actualUrl).to.match(re);
          });
        });

        it('should allow for copying the saved object URL', async function () {
          const expectedUrl =
            baseUrl +
            '/app/discover#' +
            '/view/ab12e3c0-f231-11e6-9486-733b1ac9221a' +
            '?_g=(filters%3A!()%2CrefreshInterval%3A(pause%3A!t%2Cvalue%3A0)' +
            "%2Ctime%3A(from%3A'2015-09-19T06%3A31%3A44.000Z'%2C" +
            "to%3A'2015-09-23T18%3A31%3A44.000Z'))";
          await PageObjects.discover.loadSavedSearch('A Saved Search');
          await PageObjects.share.clickShareTopNavButton();
          await PageObjects.share.exportAsSavedObject();
          const actualUrl = await PageObjects.share.getSharedUrl();
          expect(actualUrl).to.be(expectedUrl);
        });
      });
    });

    describe('shared links with state in sessionStorage', async () => {
      let teardown;
      before(async function () {
        teardown = await setup({ storeStateInSessionStorage: true });
      });

      after(async function () {
        await teardown();
      });

      describe('permalink', function () {
        it('should allow for copying the snapshot URL as a short URL and should open it', async function () {
          const re = new RegExp(baseUrl + '/goto/[0-9a-f]{32}$');
          await PageObjects.share.checkShortenUrl();
          let actualUrl;
          await retry.try(async () => {
            actualUrl = await PageObjects.share.getSharedUrl();
            expect(actualUrl).to.match(re);
          });

          const actualTime = await PageObjects.timePicker.getTimeConfig();

          await browser.clearSessionStorage();
          await browser.get(actualUrl, false);
          await retry.waitFor('shortUrl resolves and opens', async () => {
            const resolvedUrl = await browser.getCurrentUrl();
            expect(resolvedUrl).to.match(/discover/);
            const resolvedTime = await PageObjects.timePicker.getTimeConfig();
            expect(resolvedTime.start).to.equal(actualTime.start);
            expect(resolvedTime.end).to.equal(actualTime.end);
            return true;
          });
        });
      });
    });
  });
}
