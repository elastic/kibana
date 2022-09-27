/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

interface UrlState {
  globalState: string;
  appState: string;
}

type TestingModes = 'snapshot' | 'savedObject';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  // const log = getService('log');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');

  const PageObjects = getPageObjects(['dashboard', 'common', 'share', 'timePicker']);

  describe('share dashboard', () => {
    const getSharedUrl = async (mode: TestingModes): Promise<string> => {
      if (mode === 'savedObject') await PageObjects.share.exportAsSavedObject();
      const sharedUrl = await PageObjects.share.getSharedUrl();
      return sharedUrl;
    };

    const getStateFromUrl = (url: string): UrlState => {
      const globalStateStart = url.indexOf('_g');
      const appStateStart = url.indexOf('_a');
      const globalState = url.substring(globalStateStart + 3, appStateStart - 1);
      const appState = url.substring(appStateStart + 3, url.length);
      return {
        globalState,
        appState,
      };
    };

    const testSharedState = async (mode: TestingModes) => {
      describe('test "filters" state', async () => {
        it('should not have "filters" state when no filters', async () => {
          expect(await getSharedUrl(mode)).to.not.contain('filters');
        });

        it('unpinned filters should show up only in app state ', async () => {
          await filterBar.addFilter('geo.src', 'is', 'AE');
          await PageObjects.dashboard.waitForRenderComplete();

          const sharedUrl = await getSharedUrl(mode);
          const { globalState, appState } = getStateFromUrl(sharedUrl);
          expect(globalState).to.not.contain('filters');
          expect(appState).to.contain('filters');
        });

        it('pinned filters should show up only in global state', async () => {
          await filterBar.toggleFilterPinned('geo.src');
          await PageObjects.dashboard.waitForRenderComplete();

          const sharedUrl = await getSharedUrl(mode);
          const { globalState, appState } = getStateFromUrl(sharedUrl);
          expect(globalState).to.contain('filters');
          expect(appState).to.not.contain('filters');
        });
      });

      // describe('test "timeRange" state', async () => {});
    };

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
      await PageObjects.dashboard.loadSavedDashboard('few panels');

      await PageObjects.dashboard.switchToEditMode();
      const from = 'Sep 19, 2017 @ 06:31:44.000';
      const to = 'Sep 23, 2018 @ 18:31:44.000';
      await PageObjects.timePicker.setAbsoluteRange(from, to);
      await PageObjects.dashboard.waitForRenderComplete();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('snapshot share', async () => {
      describe('test local state', async () => {
        it('should not have "panels" state when not in unsaved changes state', async () => {
          await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
          expect(await getSharedUrl('snapshot')).to.not.contain('panels');
        });

        it('should have "panels" in app state when a panel has been modified', async () => {
          await dashboardPanelActions.setCustomPanelTitle('Test New Title');
          await PageObjects.dashboard.waitForRenderComplete();
          await testSubjects.existOrFail('dashboardUnsavedChangesBadge');

          const sharedUrl = await getSharedUrl('snapshot');
          const { appState } = getStateFromUrl(sharedUrl);
          expect(appState).to.contain('panels');
        });

        it('should once again not have "panels" state when save is clicked', async () => {
          await PageObjects.dashboard.clickQuickSave();
          await PageObjects.dashboard.waitForRenderComplete();
          expect(await getSharedUrl('snapshot')).to.not.contain('panels');
        });
      });

      describe('test remaining snapshot URL state', async () => {
        await testSharedState('snapshot');
      });

      after(async () => {
        await filterBar.removeAllFilters();
        await PageObjects.dashboard.clickQuickSave();
        await PageObjects.dashboard.waitForRenderComplete();
      });
    });

    describe('saved object share', async () => {
      describe('test saved object URL state', async () => {
        await testSharedState('savedObject');
      });
    });
  });
}
