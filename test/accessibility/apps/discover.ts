/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'share', 'timePicker']);
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const TEST_COLUMN_NAMES = ['extension', 'geo.src'];

  describe('Discover a11y tests', () => {
    before(async () => {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
        'doc_table:legacy': true,
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await esArchiver.unload('logstash_functional');
    });

    it('Discover main page', async () => {
      await a11y.testAppSnapshot();
    });

    it('a11y test on save button', async () => {
      await PageObjects.discover.clickSaveSearchButton();
      await a11y.testAppSnapshot();
    });

    it('a11y test on save search panel', async () => {
      await PageObjects.discover.inputSavedSearchTitle('a11ySearch');
      await a11y.testAppSnapshot();
    });

    it('a11y test on clicking on confirm save', async () => {
      await PageObjects.discover.clickConfirmSavedSearch();
      await a11y.testAppSnapshot();
    });

    it('a11y test on click new to reload discover', async () => {
      await PageObjects.discover.clickNewSearchButton();
      await a11y.testAppSnapshot();
    });

    it('a11y test on load saved search panel', async () => {
      await PageObjects.discover.openLoadSavedSearchPanel();
      await a11y.testAppSnapshot();
      await PageObjects.discover.closeLoadSavedSearchPanel();
    });

    it('a11y test on inspector panel', async () => {
      await inspector.open();
      await a11y.testAppSnapshot();
      await inspector.close();
    });

    it('a11y test on share panel', async () => {
      await PageObjects.share.clickShareTopNavButton();
      await a11y.testAppSnapshot();
    });

    it('a11y test on open sidenav filter', async () => {
      await PageObjects.discover.openSidebarFieldFilter();
      await a11y.testAppSnapshot();
      await PageObjects.discover.closeSidebarFieldFilter();
    });

    it('a11y test on tables with columns view', async () => {
      for (const columnName of TEST_COLUMN_NAMES) {
        await PageObjects.discover.clickFieldListItemToggle(columnName);
      }
      await a11y.testAppSnapshot();
    });

    it('a11y test on save queries popover', async () => {
      await PageObjects.discover.clickSavedQueriesPopOver();
      await a11y.testAppSnapshot();
    });

    it('a11y test on save queries panel', async () => {
      await PageObjects.discover.clickCurrentSavedQuery();
      await a11y.testAppSnapshot();
    });

    it('a11y test on toggle include filters option on saved queries panel', async () => {
      await PageObjects.discover.setSaveQueryFormTitle('test');
      await PageObjects.discover.toggleIncludeFilters();
      await a11y.testAppSnapshot();
      await PageObjects.discover.saveCurrentSavedQuery();
    });

    // issue - https://github.com/elastic/kibana/issues/78488
    it.skip('a11y test on saved queries list panel', async () => {
      await PageObjects.discover.clickSavedQueriesPopOver();
      await testSubjects.moveMouseTo(
        'saved-query-list-item load-saved-query-test-button saved-query-list-item-selected saved-query-list-item-selected'
      );
      await testSubjects.find('delete-saved-query-test-button');
      await a11y.testAppSnapshot();
    });
  });
}
