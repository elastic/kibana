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

export default function({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover']);

  describe('test large strings', function() {
    before(async function() {
      await esArchiver.load('empty_kibana');
      await esArchiver.loadIfNeeded('hamlet');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'testlargestring' });
    });

    it('verify the large string book present', async function() {
      const ExpectedDoc =
        'mybook:Project Gutenberg EBook of Hamlet, by William Shakespeare' +
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

    describe('test large data', function() {
      it('search Newsletter should show the correct hit count', async function() {
        const expectedHitCount = '1';
        await queryBar.setQuery('Newsletter');
        await queryBar.submitQuery();
        await retry.try(async function tryingForTime() {
          const hitCount = await PageObjects.discover.getHitCount();
          expect(hitCount).to.be(expectedHitCount);
          log.debug('test Newsletter keyword is searched');
        });
      });

      it('the search term Newsletter should be highlighted in the field data', async function() {
        // marks is the style that highlights the text in yellow
        const marks = await PageObjects.discover.getMarks();
        expect(marks.length).to.be(1);
        log.debug('Newsletter appears only once');
      });
    });

    after(async () => {
      await esArchiver.unload('hamlet');
    });
  });
}
