/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  const { common, discover, dashboard, header, timePicker } = getPageObjects([
    'common',
    'discover',
    'dashboard',
    'header',
    'timePicker',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'doc_table:legacy': true,
  };

  describe('discover esql grid with legacy setting', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
    });

    it('should render esql view correctly', async function () {
      const savedSearchESQL = 'testESQLWithLegacySetting';
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.existOrFail('docTableHeader');
      await testSubjects.missingOrFail('euiDataGridBody');

      await discover.selectTextBaseLang();

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('docTableHeader');
      await testSubjects.existOrFail('euiDataGridBody');

      await dataGrid.clickRowToggle({ rowIndex: 0 });

      await testSubjects.existOrFail('docViewerFlyout');

      await discover.saveSearch(savedSearchESQL);

      await common.navigateToApp('dashboard');
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultAbsoluteRange();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(savedSearchESQL);
      await header.waitUntilLoadingHasFinished();

      await testSubjects.missingOrFail('docTableHeader');
      await testSubjects.existOrFail('euiDataGridBody');

      await dataGrid.clickRowToggle({ rowIndex: 0 });

      await testSubjects.existOrFail('docViewerFlyout');

      await dashboardPanelActions.removePanelByTitle(savedSearchESQL);

      await dashboardAddPanel.addSavedSearch('A Saved Search');

      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('docTableHeader');
      await testSubjects.missingOrFail('euiDataGridBody');
    });
  });
}
