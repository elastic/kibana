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
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker']);

  describe('dashboard data-shared attributes', function describeIndexTests() {
    let originalPanelTitles: string[];

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('dashboard with everything');
      await PageObjects.dashboard.waitForRenderComplete();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should have time picker with data-shared-timefilter-duration', async () => {
      await retry.try(async () => {
        const sharedData = await PageObjects.timePicker.getTimeDurationForSharing();
        expect(sharedData).to.not.be(null);
      });
    });

    it('should have data-shared-items-count set to the number of embeddables on the dashboard', async () => {
      await retry.try(async () => {
        const sharedItemsCount = await PageObjects.dashboard.getSharedItemsCount();
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(sharedItemsCount).to.eql(panelCount);
      });
    });

    it('should have panels with expected data-shared-item title', async () => {
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        originalPanelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(sharedData.map((item) => item.title)).to.eql(originalPanelTitles);
      });
    });

    it('data shared item container data has description and title set', async () => {
      const sharedContainerData = await PageObjects.dashboard.getSharedContainerData();
      expect(sharedContainerData.title).to.be('dashboard with everything');
      expect(sharedContainerData.description).to.be(
        'I have one of every visualization type since the last time I was created!'
      );
    });

    it('data-shared-item title should update a viz when using a custom panel title', async () => {
      await PageObjects.dashboard.switchToEditMode();
      const CUSTOM_VIS_TITLE = 'ima custom title for a vis!';
      await dashboardPanelActions.setCustomPanelTitle(CUSTOM_VIS_TITLE);
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find((item) => {
          return item.title === CUSTOM_VIS_TITLE;
        });
        expect(foundSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title is cleared with an empty panel title string', async () => {
      await dashboardPanelActions.toggleHidePanelTitle();
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find((item) => {
          return item.title === '';
        });
        expect(foundSharedItemTitle).to.be(true);
      });
      await dashboardPanelActions.toggleHidePanelTitle();
    });

    it('data-shared-item title can be reset', async () => {
      await dashboardPanelActions.resetCustomPanelTitle();
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundOriginalSharedItemTitle = !!sharedData.find((item) => {
          return item.title === originalPanelTitles[0];
        });
        expect(foundOriginalSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title should update a saved search when using a custom panel title', async () => {
      const CUSTOM_SEARCH_TITLE = 'ima custom title for a search!';
      await dashboardPanelActions.setCustomPanelTitle(
        CUSTOM_SEARCH_TITLE,
        'Rendering Test: saved search'
      );
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find((item) => {
          return item.title === CUSTOM_SEARCH_TITLE;
        });
        expect(foundSharedItemTitle).to.be(true);
      });
    });
  });
}
