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
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'dashboard',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'doc_table:legacy': true,
  };

  describe('discover esql grid with legacy setting', async function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
    });

    it('should render esql view correctly', async function () {
      const savedSearchESQL = 'testESQLWithLegacySetting';
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.existOrFail('docTableHeader');
      await testSubjects.missingOrFail('euiDataGridBody');

      await PageObjects.discover.selectTextBaseLang();

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('docTableHeader');
      await testSubjects.existOrFail('euiDataGridBody');

      await dataGrid.clickRowToggle({ rowIndex: 0 });

      await testSubjects.existOrFail('docViewerFlyout');

      await PageObjects.discover.saveSearch(savedSearchESQL);

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(savedSearchESQL);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.missingOrFail('docTableHeader');
      await testSubjects.existOrFail('euiDataGridBody');

      await dataGrid.clickRowToggle({ rowIndex: 0 });

      await testSubjects.existOrFail('docViewerFlyout');

      await dashboardPanelActions.removePanelByTitle(savedSearchESQL);

      await dashboardAddPanel.addSavedSearch('A Saved Search');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('docTableHeader');
      await testSubjects.missingOrFail('euiDataGridBody');
    });
  });
}
