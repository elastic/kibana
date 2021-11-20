/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({
  getService,
  getPageObjects,
}: {
  getService: (service: string) => any;
  getPageObjects: (pageObjects: string[]) => any;
}) {
  describe('discover data grid tests', function describeDiscoverDataGrid() {
    const esArchiver = getService('esArchiver');
    const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
    const kibanaServer = getService('kibanaServer');
    const defaultSettings = { defaultIndex: 'logstash-*', 'doc_table:legacy': false };
    const testSubjects = getService('testSubjects');

    before(async function () {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({ 'doc_table:legacy': true });
    });

    it('can add fields to the table', async function () {
      const getTitles = async () =>
        (await testSubjects.getVisibleText('dataGridHeader')).replace(/\s|\r?\n|\r/g, ' ');

      expect(await getTitles()).to.be('@timestamp Document');

      await PageObjects.discover.clickFieldListItemAdd('bytes');
      expect(await getTitles()).to.be('@timestamp bytes');

      await PageObjects.discover.clickFieldListItemAdd('agent');
      expect(await getTitles()).to.be('@timestamp bytes agent');

      await PageObjects.discover.clickFieldListItemRemove('bytes');
      expect(await getTitles()).to.be('@timestamp agent');

      await PageObjects.discover.clickFieldListItemRemove('agent');
      expect(await getTitles()).to.be('@timestamp Document');
    });
  });
}
