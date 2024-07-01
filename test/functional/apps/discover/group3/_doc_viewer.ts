/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'header']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');

  describe('discover doc viewer', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    beforeEach(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        hideAnnouncements: true,
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    describe('search', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click();
      });

      it('should be able to search by string', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('geo');

        await retry.waitFor('first updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });

        await PageObjects.discover.findFieldByNameInDocViewer('.s');

        await retry.waitFor('second updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search by wildcard', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('relatedContent*image');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search with spaces as wildcard', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('relatedContent image');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });
      });

      it('should ignore empty search', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('   '); // only spaces

        await retry.waitFor('the clear button', async () => {
          return await testSubjects.exists('clearSearchButton');
        });

        // expect no changes in the list
        await retry.waitFor('all items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });
    });
  });
}
