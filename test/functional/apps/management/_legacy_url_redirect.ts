/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const kibanaServer = getService('kibanaServer');

  describe('legacy urls redirect correctly', () => {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    it('redirects correctly to index pattern management', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();

      const url = await (await browser.getCurrentUrl()).split('#')[0];
      const modifiedUrl = url.replace('indexPatterns', 'dataViews');
      await browser.navigateTo(modifiedUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const newUrl = (await browser.getCurrentUrl()).split('#')[0];
      expect(newUrl).to.equal(url);
    });

    it('redirects correctly to specific index pattern', async () => {
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();

      const url = await (await browser.getCurrentUrl()).split('#')[0];
      const modifiedUrl = url.replace('patterns', 'dataView').replace('indexPatterns', 'dataViews');
      await browser.navigateTo(modifiedUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const newUrl = (await browser.getCurrentUrl()).split('#')[0];
      expect(newUrl).to.equal(url);
    });
  });
}
