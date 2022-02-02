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
  const retry = getService('retry');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'share', 'timePicker']);
  const browser = getService('browser');
  const toasts = getService('toasts');
  const deployment = getService('deployment');

  describe('shared links', function describeIndexTests() {
    let baseUrl: string;

    async function setup({ storeStateInSessionStorage }: { storeStateInSessionStorage: boolean }) {
      baseUrl = deployment.getHostPort();
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
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

      await kibanaServer.uiSettings.replace({
        'state:storeInSessionStorage': storeStateInSessionStorage,
      });

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      await PageObjects.timePicker.setDefaultAbsoluteRange();

      // After hiding the time picker, we need to wait for
      // the refresh button to hide before clicking the share button
      await PageObjects.common.sleep(1000);

      await PageObjects.share.clickShareTopNavButton();

      return async () => {
        await kibanaServer.uiSettings.unset('state:storeInSessionStorage');
      };
    }

    describe('shared links with state in query', async () => {
      let teardown: () => Promise<void>;
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
            "-23T18:31:44.000Z'))&_a=(columns:!(),filters:!(),index:'logstash-" +
            "*',interval:auto,query:(language:kuery,query:'')" +
            ",sort:!(!('@timestamp',desc)))";
          const actualUrl = await PageObjects.share.getSharedUrl();
          // strip the timestamp out of each URL
          expect(actualUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')).to.be(
            expectedUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')
          );
        });

        it('should allow for copying the snapshot URL as a short URL', async function () {
          const re = new RegExp(baseUrl + '/app/r/s/.+$');
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

        it('should load snapshot URL with empty sort param correctly', async function () {
          const expectedUrl =
            baseUrl +
            '/app/discover?_t=1453775307251#' +
            '/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time' +
            ":(from:'2015-09-19T06:31:44.000Z',to:'2015-09" +
            "-23T18:31:44.000Z'))&_a=(columns:!(),filters:!(),index:'logstash-" +
            "*',interval:auto,query:(language:kuery,query:'')" +
            ',sort:!())';
          await browser.navigateTo(expectedUrl);
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await retry.waitFor('url to contain default sorting', async () => {
            // url fallback default sort should have been pushed to URL
            const url = await browser.getCurrentUrl();
            return url.includes('sort:!(!(%27@timestamp%27,desc))');
          });

          await retry.waitFor('document table to contain the right timestamp', async () => {
            const firstRowText = await PageObjects.discover.getDocTableIndex(1);
            return firstRowText.includes('Sep 22, 2015 @ 23:50:13.253');
          });
        });
      });
    });

    describe('shared links with state in sessionStorage', async () => {
      let teardown: () => Promise<void>;
      before(async function () {
        teardown = await setup({ storeStateInSessionStorage: true });
      });

      after(async function () {
        await teardown();
      });

      it('should allow for copying the snapshot URL as a short URL and should open it', async function () {
        const re = new RegExp(baseUrl + '/app/r/s/.+$');
        await PageObjects.share.checkShortenUrl();
        let actualUrl: string = '';
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

      it("sharing hashed url shouldn't crash the app", async () => {
        const currentUrl = await browser.getCurrentUrl();
        await browser.clearSessionStorage();
        await browser.get(currentUrl, false);
        await retry.waitFor('discover to open', async () => {
          const resolvedUrl = await browser.getCurrentUrl();
          expect(resolvedUrl).to.match(/discover/);
          const { message } = await toasts.getErrorToast();
          expect(message).to.contain(
            'Unable to completely restore the URL, be sure to use the share functionality.'
          );
          await toasts.dismissAllToasts();
          return true;
        });
      });
    });
  });
}
