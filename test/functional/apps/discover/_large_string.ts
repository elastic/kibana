/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover']);

  describe('test large strings', function () {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'kibana_large_strings']);
      await esArchiver.load('empty_kibana');
      await esArchiver.loadIfNeeded('hamlet');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'testlargestring' });
    });

    it('verify the large string book present', async function () {
      const ExpectedDoc =
        '_id:1 _type: - _index:testlargestring _score:0' +
        ' mybook:Project Gutenberg EBook of Hamlet, by William Shakespeare' +
        ' This eBook is for the use of anyone anywhere in the United States' +
        ' and most other parts of the world at no cost and with almost no restrictions whatsoever.' +
        ' You may copy it, give it away or re-use it under the terms of the' +
        ' Project Gutenberg License included with this eBook or online at www.gutenberg.org.' +
        ' If you are not located in the United States,' +
        ' you’ll have to check the laws of the country where you are' +
        ' located before using this ebook.' +
        ' Title: Hamlet Author: William Shakespeare Release Date: November 1998 [EBook #1524]' +
        ' Last Updated: December 30, 2017 Language: English Character set encoding:';

      let rowData;
      await PageObjects.common.navigateToApp('discover');
      await retry.try(async function tryingForTime() {
        rowData = await PageObjects.discover.getDocTableIndex(1);
        log.debug('rowData.length=' + rowData.length);
        expect(rowData.substring(0, 200)).to.be(ExpectedDoc.substring(0, 200));
      });
    });

    describe('test large data', function () {
      it('search Newsletter should show the correct hit count', async function () {
        const expectedHitCount = '1';
        await queryBar.setQuery('Newsletter');
        await queryBar.submitQuery();
        await retry.try(async function tryingForTime() {
          const hitCount = await PageObjects.discover.getHitCount();
          expect(hitCount).to.be(expectedHitCount);
          log.debug('test Newsletter keyword is searched');
        });
      });

      it('the search term Newsletter should be highlighted in the field data', async function () {
        // marks is the style that highlights the text in yellow
        const marks = await PageObjects.discover.getMarks();
        expect(marks.length).to.be(1);
        log.debug('Newsletter appears only once');
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('hamlet');
    });
  });
}
