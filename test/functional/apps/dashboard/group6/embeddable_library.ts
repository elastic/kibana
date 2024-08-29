/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard } = getPageObjects(['dashboard']);
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const panelActions = getService('dashboardPanelActions');
  const savedObjectsFinder = getService('savedObjectsFinder');

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
      await savedObjectsFinder.filterEmbeddableNames('Rendering Test: heatmap');
      await find.clickByButtonText('Rendering Test: heatmap');
      await dashboardAddPanel.closeAddPanel();

      await panelActions.legacyUnlinkFromLibrary('RenderingTest:heatmap');
      await panelActions.expectNotLinkedToLibrary('RenderingTest:heatmap');

      await dashboardAddPanel.clickOpenAddPanel();
      await savedObjectsFinder.filterEmbeddableNames('Rendering Test: heatmap');
      await find.existsByLinkText('Rendering Test: heatmap');
      await dashboardAddPanel.closeAddPanel();
    });

    it('save visualize panel to embeddable library', async () => {
      const newTitle = 'Rendering Test: heatmap - copy';
      await panelActions.legacySaveToLibrary(newTitle, 'RenderingTest:heatmap');
      await panelActions.expectLinkedToLibrary(newTitle);
    });
  });
}
