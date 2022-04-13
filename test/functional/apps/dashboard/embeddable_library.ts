/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'settings', 'common']);
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const panelActions = getService('dashboardPanelActions');

  describe('embeddable library', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    it('unlink visualize panel from embeddable library', async () => {
      // add heatmap panel from library
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('Rendering Test: heatmap');
      await find.clickByButtonText('Rendering Test: heatmap');
      await dashboardAddPanel.closeAddPanel();

      const originalPanel = await testSubjects.find('embeddablePanelHeading-RenderingTest:heatmap');
      await panelActions.unlinkFromLibary(originalPanel);

      const updatedPanel = await testSubjects.find('embeddablePanelHeading-RenderingTest:heatmap');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        updatedPanel,
        10
      );
      expect(libraryActionExists).to.be(false);

      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('Rendering Test: heatmap');
      await find.existsByLinkText('Rendering Test: heatmap');
      await dashboardAddPanel.closeAddPanel();
    });

    it('save visualize panel to embeddable library', async () => {
      const originalPanel = await testSubjects.find('embeddablePanelHeading-RenderingTest:heatmap');
      await panelActions.saveToLibrary('Rendering Test: heatmap - copy', originalPanel);
      await testSubjects.existOrFail('addPanelToLibrarySuccess');

      const updatedPanel = await testSubjects.find(
        'embeddablePanelHeading-RenderingTest:heatmap-copy'
      );
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        updatedPanel
      );
      expect(libraryActionExists).to.be(true);
    });
  });
}
