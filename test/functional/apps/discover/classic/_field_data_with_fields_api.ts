/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'visualize', 'timePicker']);
  const find = getService('find');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  describe('discover tab with new fields API', function describeIndexTests() {
    before(async function () {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        'discover:searchFieldsFromSource': false,
        'doc_table:legacy': true,
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({});
    });

    it('doc view should sort ascending', async function () {
      const expectedTimeStamp = 'Sep 20, 2015 @ 00:00:00.000';
      await testSubjects.click('docTableHeaderFieldSort_@timestamp');

      // we don't technically need this sleep here because the tryForTime will retry and the
      // results will match on the 2nd or 3rd attempt, but that debug output is huge in this
      // case and it can be avoided with just a few seconds sleep.
      await PageObjects.common.sleep(2000);
      await retry.try(async function tryingForTime() {
        const row = await find.byCssSelector(`tr.kbnDocTable__row:nth-child(1)`);
        const rowData = await row.getVisibleText();

        expect(rowData.startsWith(expectedTimeStamp)).to.be.ok();
      });
    });
  });
}
