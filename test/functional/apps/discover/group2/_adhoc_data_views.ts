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
  const toasts = getService('toasts');
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const fieldEditor = getService('fieldEditor');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
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
      const prevDataViewId = await PageObjects.discover.getCurrentDataViewId();

      await PageObjects.discover.saveSearch('logstash*-ss');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await PageObjects.discover.getCurrentDataViewId();

      expect(prevDataViewId).to.equal(newDataViewId);
    });

    it('should update data view id when saving new search copy', async () => {
      const prevDataViewId = await PageObjects.discover.getCurrentDataViewId();

      await PageObjects.discover.saveSearch('logstash*-ss-new', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await PageObjects.discover.getCurrentDataViewId();

      expect(prevDataViewId).not.to.equal(newDataViewId);
    });

    it('should update data view id when saving data view from hoc one', async () => {
      const prevDataViewId = await PageObjects.discover.getCurrentDataViewId();

      await testSubjects.click('discoverAlertsButton');
      await testSubjects.click('confirmModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await PageObjects.discover.getCurrentDataViewId();

      expect(prevDataViewId).not.to.equal(newDataViewId);
    });

    it('search results should be different after data view update', async () => {
      await PageObjects.discover.createAdHocDataView('logst', true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const prevDataViewId = await PageObjects.discover.getCurrentDataViewId();

      // trigger data view id update
      await PageObjects.discover.addRuntimeField(
        '_bytes-runtimefield',
        `emit(doc["bytes"].value.toString())`
      );
      await PageObjects.discover.clickFieldListItemToggle('_bytes-runtimefield');
      const newDataViewId = await PageObjects.discover.getCurrentDataViewId();
      expect(newDataViewId).not.to.equal(prevDataViewId);

      // save first search
      await PageObjects.discover.saveSearch('logst*-ss-_bytes-runtimefield');
      await PageObjects.common.sleep(5000);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // remove field and create with the same name, but different value
      await PageObjects.discover.clickFieldListItemRemove('_bytes-runtimefield');
      await PageObjects.common.sleep(5000);
      await PageObjects.discover.removeField('_bytes-runtimefield');
      await PageObjects.common.sleep(10000);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(5000);

      // trigger data view id update
      await PageObjects.discover.addRuntimeField(
        '_bytes-runtimefield',
        `emit((doc["bytes"].value * 2).toString())`
      );
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

    it('should update id after data view field edit', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.loadSavedSearch('logst*-ss-_bytes-runtimefield');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const prevDataViewId = await PageObjects.discover.getCurrentDataViewId();

      // trigger data view id update
      await dataGrid.clickEditField('_bytes-runtimefield');
      await fieldEditor.setName('_bytes-runtimefield-edited', true);
      await fieldEditor.save();
      await fieldEditor.confirmSave();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const newDataViewId = await PageObjects.discover.getCurrentDataViewId();
      expect(prevDataViewId).not.to.equal(newDataViewId);
    });

    it('should notify about invalid filter reffs', async () => {
      await PageObjects.discover.createAdHocDataView('logstas', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await filterBar.addFilter('nestedField.child', 'is', 'nestedValue');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await filterBar.addFilter('extension', 'is', 'jpg');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const first = await PageObjects.discover.getCurrentDataViewId();
      // trigger data view id update
      await PageObjects.discover.addRuntimeField(
        '_bytes-runtimefield',
        `emit((doc["bytes"].value * 2).toString())`
      );
      await PageObjects.header.waitUntilLoadingHasFinished();

      const second = await PageObjects.discover.getCurrentDataViewId();
      expect(first).not.equal(second);

      await toasts.dismissAllToasts();

      await browser.goBack();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const firstToast = await toasts.getToastContent(1);
      expect(firstToast).to.equal(
        `"${first}" is not a configured data view ID\nShowing the saved data view: "logstas*" (${second})`
      );

      const secondToast = await toasts.getToastContent(2);
      expect(secondToast).to.equal(
        `Different index references\nData view id references in some of the applied filters differ from the current data view.`
      );
    });
  });
}
