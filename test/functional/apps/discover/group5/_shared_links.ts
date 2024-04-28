/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'share', 'timePicker']);
  const browser = getService('browser');
  const toasts = getService('toasts');
  const deployment = getService('deployment');

  // defaults to short urls
  describe('shared links', function describeIndexTests() {
    let baseUrl: string;

    async function setup({ storeStateInSessionStorage }: { storeStateInSessionStorage: boolean }) {
      baseUrl = deployment.getHostPort();
      log.debug('baseUrl = ' + baseUrl);
      // browsers don't show the ':port' if it's 80 or 443 so we have to
      // remove that part so we can get a match in the tests.
      baseUrl = baseUrl.replace(':80', '').replace(':443', '');
      log.debug('New baseUrl = ' + baseUrl);

      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

      await kibanaServer.uiSettings.replace({
        'state:storeInSessionStorage': storeStateInSessionStorage,
        defaultIndex: 'logstash-*',
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.share.clickShareTopNavButton();

      return async () => {
        await kibanaServer.uiSettings.unset('state:storeInSessionStorage');
      };
    }

    describe('shared links with state in sessionStorage', async () => {
      let teardown: () => Promise<void>;
      before(async function () {
        teardown = await setup({ storeStateInSessionStorage: true });
      });

      after(async function () {
        await teardown();
      });

      it("sharing hashed url shouldn't crash the app", async () => {
        const currentUrl = await browser.getCurrentUrl();
        await retry.try(async () => {
          await browser.clearSessionStorage();
          await browser.get(currentUrl, false);
          const resolvedUrl = await browser.getCurrentUrl();
          expect(resolvedUrl).to.match(/discover/);
          const { title } = await toasts.getErrorByIndex(1, true);
          expect(title).to.contain(
            'Unable to completely restore the URL, be sure to use the share functionality.'
          );
        });
        await toasts.dismissAll();
      });
    });
  });
}
