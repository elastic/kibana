/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard } = getPageObjects(['dashboard']);
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const panelActions = getService('dashboardPanelActions');
  const savedObjectsFinder = getService('savedObjectsFinder');
  const title = 'Rendering Test: heatmap';

  describe('embeddable library', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.clickNewDashboard();
    });

    it('unlink visualize panel from embeddable library', async () => {
      // add heatmap panel from library
      await dashboardAddPanel.clickOpenAddPanel();
      await savedObjectsFinder.filterEmbeddableNames(title);
      await find.clickByButtonText(title);
      await dashboardAddPanel.closeAddPanel();

      await panelActions.unlinkFromLibrary(title);
      await panelActions.expectNotLinkedToLibrary(title);

      await dashboardAddPanel.clickOpenAddPanel();
      await savedObjectsFinder.filterEmbeddableNames(title);
      await find.existsByLinkText(title);
      await dashboardAddPanel.closeAddPanel();
    });

    it('save visualize panel to embeddable library', async () => {
      const newTitle = 'Rendering Test: heatmap - copy';
      await panelActions.saveToLibrary(newTitle, title);
      await panelActions.expectLinkedToLibrary(newTitle);
    });
  });
}
