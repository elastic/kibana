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
  const dashboardAddPanel = getService('dashboardAddPanel');
  const fieldEditor = getService('fieldEditor');
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
    'dashboard',
  ]);
  const find = getService('find');
  const security = getService('security');

  const getCurrentDataViewId = async () => {
    const currentUrl = await browser.getCurrentUrl();
    const [indexSubstring] = currentUrl.match(/index:[^,]*/)!;
    const dataViewId = indexSubstring.replace('index:', '');
    return dataViewId;
  };

  const addRuntimeField = async (name: string, script: string) => {
    await PageObjects.discover.clickAddField();
    await fieldEditor.setName(name);
    await fieldEditor.enableValue();
    await fieldEditor.typeScript(script);
    await fieldEditor.save();
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const addSearchToDashboard = async (name: string) => {
    await dashboardAddPanel.addSavedSearch(name);
    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.dashboard.waitForRenderComplete();
  };

  describe('adhoc data views', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');

      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
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

      await PageObjects.discover.saveSearch('logstash*-ss');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await getCurrentDataViewId();

      expect(prevDataViewId).to.equal(newDataViewId);
    });

    it('should update data view id when saving new search copy', async () => {
      const prevDataViewId = await getCurrentDataViewId();

      await PageObjects.discover.saveSearch('logstash*-ss-new', true);
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

    it('search results should be different after data view update', async () => {
      await PageObjects.discover.createAdHocDataView('logst', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await addRuntimeField('_bytes-runtimefield', `emit(doc["bytes"].value.toString())`);
      await PageObjects.discover.clickFieldListItemToggle('_bytes-runtimefield');

      // save first search
      await PageObjects.discover.saveSearch('logst*-ss-_bytes-runtimefield');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // remove field and create with the same name, but different value
      await PageObjects.discover.clickFieldListItemRemove('_bytes-runtimefield');
      await PageObjects.discover.removeField('_bytes-runtimefield');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await addRuntimeField('_bytes-runtimefield', `emit((doc["bytes"].value * 2).toString())`);
      await PageObjects.discover.clickFieldListItemToggle('_bytes-runtimefield');

      // save second search
      await PageObjects.discover.saveSearch('logst*-ss-_bytes-runtimefield-updated', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // open searches on dashboard
      await PageObjects.common.navigateToApp('dashboard');
      await filterBar.ensureFieldEditorModalIsClosed();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();

      await addSearchToDashboard('logst*-ss-_bytes-runtimefield');
      await addSearchToDashboard('logst*-ss-_bytes-runtimefield-updated');

      const [firstSearchCell, secondSearchCell] = await dataGrid.getAllCellElements(0, 3);
      const first = await firstSearchCell.getVisibleText();
      const second = await secondSearchCell.getVisibleText();

      expect(+second).to.equal(+first * 2);
    });
  });
}
