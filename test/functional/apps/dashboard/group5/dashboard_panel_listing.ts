/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'settings', 'common']);
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard panel listing', function () {
    this.tags('skipFIPS');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('renders a panel with predefined order of panel groups and panels', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.switchToEditMode();

      await dashboardAddPanel.clickEditorMenuButton();

      const panelSelectionList = await testSubjects.find('dashboardPanelSelectionList');

      const panelGroupByOrder = new Map();

      const panelGroups = await panelSelectionList.findAllByCssSelector(
        '[data-test-subj*="dashboardEditorMenu-"]'
      );

      const panelTypes = await panelSelectionList.findAllByCssSelector('li');

      for (let i = 0; i < panelGroups.length; i++) {
        const panelGroup = panelGroups[i];
        const order = await panelGroup.getAttribute('data-group-sort-order');
        // @ts-ignore
        const [, panelGroupTitle] = (await panelGroup.getAttribute('data-test-subj'))?.match(
          /dashboardEditorMenu-(.*)/
        );

        panelGroupByOrder.set(order, panelGroupTitle);
      }

      expect(panelGroupByOrder.size).to.eql(3);

      expect([...panelGroupByOrder.values()]).to.eql([
        'visualizationsGroup',
        'annotation-and-navigationGroup',
        'observabilityGroup',
      ]);

      // Any changes to the number of panels needs to be audited by @elastic/kibana-presentation
      expect(panelTypes.length).to.eql(9);
    });
  });
}
