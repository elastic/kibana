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
  const dataGrid = getService('dataGrid');
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'unifiedSearch',
    'discover',
    'timePicker',
    'settings',
    'header',
    'context',
  ]);
  const find = getService('find');
  const security = getService('security');

  const getCurrentDataViewId = async () => {
    const currentUrl = await browser.getCurrentUrl();
    const [indexSubstring] = currentUrl.match(/index:[^,]*/)!;
    const dataViewId = indexSubstring.replace('index:', '');
    return dataViewId;
  };

  describe('ad hoc data views', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    it('should navigate back correctly from to surrounding and single views', async () => {
      await PageObjects.discover.createAdHocDataView('logstash', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // navigate to context view
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const [, surrDocs] = await dataGrid.getRowActions({ rowIndex: 0 });
      await surrDocs.click();
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      await find.clickByCssSelector(`[data-test-subj="breadcrumb first"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.be('logstash*');

      // navigate to single doc view
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const [singleView] = await dataGrid.getRowActions({ rowIndex: 0 });
      await singleView.click();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await find.clickByCssSelector(`[data-test-subj="breadcrumb first"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.be('logstash*');
    });

    it('should support query and filtering', async () => {
      await filterBar.addFilter('nestedField.child', 'is', 'nestedValue');
      expect(await filterBar.hasFilter('nestedField.child', 'nestedValue')).to.be(true);
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be('1');
      });
      await filterBar.removeFilter('nestedField.child');

      await queryBar.setQuery('test');
      await queryBar.submitQuery();
      await retry.try(async () => expect(await PageObjects.discover.getHitCount()).to.be('22'));

      await queryBar.clearQuery();
      await queryBar.submitQuery();
    });

    it('should not update data view id when saving search first time', async () => {
      const prevDataViewId = await getCurrentDataViewId();

      await PageObjects.discover.saveSearch('hoc-data-view-search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await getCurrentDataViewId();

      expect(prevDataViewId).to.equal(newDataViewId);
    });

    it('should update data view id when saving new search copy', async () => {
      const prevDataViewId = await getCurrentDataViewId();

      await PageObjects.discover.saveSearch('hoc-data-view-search-new', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await getCurrentDataViewId();

      expect(prevDataViewId).not.to.equal(newDataViewId);
    });

    it('should update data view id when saving data view from hoc one', async () => {
      const prevDataViewId = await getCurrentDataViewId();

      await testSubjects.click('discoverAlertsButton');
      await testSubjects.click('confirmModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await getCurrentDataViewId();

      expect(prevDataViewId).not.to.equal(newDataViewId);
    });
  });
}
