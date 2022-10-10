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
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'header']);

  describe('data view relationships', function describeIndexTests() {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    it('Render relationships tab and verify count', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickRelationshipsTab();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(parseInt(await PageObjects.settings.getRelationshipsTabCount(), 10)).to.be(1);
    });
  });
}
