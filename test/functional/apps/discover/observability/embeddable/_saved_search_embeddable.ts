/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const { dashboard, header } = getPageObjects(['dashboard', 'header']);

  describe('discover/observability saved search embeddable', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const addSearchEmbeddableToDashboard = async () => {
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    it('should render content with singlePage pagination mode', async () => {
      await addSearchEmbeddableToDashboard();

      // Pagination toolbar should not be visible
      await testSubjects.missingOrFail('tablePaginationPopoverButton');
      await testSubjects.missingOrFail('pagination-button-previous');
      await testSubjects.missingOrFail('pagination-button-next');

      // Scroll to the bottom of the page
      await dataGrid.scrollTo(500, 1500); // Ugly hack to add 1500 to the current scroll position due to virtualized table adding unexpected ordered rows

      // Check the pagination footer loads
      await testSubjects.existOrFail('unifiedDataTableFooter');
    });
  });
}
