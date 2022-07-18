/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { VisualizeConstants } from '@kbn/visualizations-plugin/common/constants';
import { VISUALIZE_ENABLE_LABS_SETTING } from '@kbn/visualizations-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'settings', 'common']);
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');

  describe('create and add embeddables', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    it('ensure toolbar popover closes on add', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.switchToEditMode();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewEmbeddableLink('LOG_STREAM_EMBEDDABLE');
      await dashboardAddPanel.expectEditorMenuClosed();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('add new visualization link', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.preserveCrossAppState();
        await PageObjects.dashboard.loadSavedDashboard('few panels');
      });

      it('adds new visualization via the top nav link', async () => {
        const originalPanelCount = await PageObjects.dashboard.getPanelCount();
        await PageObjects.dashboard.switchToEditMode();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAggBasedVisualizations();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.saveVisualizationExpectSuccess(
          'visualization from top nav add new panel',
          { redirectToOrigin: true }
        );
        await retry.try(async () => {
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount + 1);
        });
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('adds a new visualization', async () => {
        const originalPanelCount = await PageObjects.dashboard.getPanelCount();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAggBasedVisualizations();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.saveVisualizationExpectSuccess(
          'visualization from add new link',
          { redirectToOrigin: true }
        );

        await retry.try(async () => {
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount + 1);
        });
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('adds a new timelion visualization', async () => {
        // adding this case, as the timelion agg-based viz doesn't need the `clickNewSearch()` step
        const originalPanelCount = await PageObjects.dashboard.getPanelCount();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAggBasedVisualizations();
        await PageObjects.visualize.clickTimelion();
        await PageObjects.visualize.saveVisualizationExpectSuccess(
          'timelion visualization from add new link',
          { redirectToOrigin: true }
        );

        await retry.try(async () => {
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount + 1);
        });
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('adds a markdown visualization via the quick button', async () => {
        const originalPanelCount = await PageObjects.dashboard.getPanelCount();
        await dashboardAddPanel.clickMarkdownQuickButton();
        await PageObjects.visualize.saveVisualizationExpectSuccess(
          'visualization from markdown quick button',
          { redirectToOrigin: true }
        );

        await retry.try(async () => {
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount + 1);
        });
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('saves the listing page instead of the visualization to the app link', async () => {
        await PageObjects.header.clickVisualize(true);
        const currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).not.to.contain(VisualizeConstants.EDIT_PATH);
      });

      after(async () => {
        await PageObjects.header.clickDashboard();
      });
    });

    describe('visualize:enableLabs advanced setting', () => {
      const LAB_VIS_NAME = 'Rendering Test: input control';

      let experimentalTypes: string[] = [];

      before(async () => {
        // get the data-test-subj values for all experimental visualizations for later tests
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await PageObjects.visualize.clickNewVisualization();
        const experimentalTypeWrappers = await PageObjects.visualize.getExperimentalTypeLinks();
        experimentalTypes = await Promise.all(
          experimentalTypeWrappers.map((element) => element.getAttribute('data-test-subj'))
        );
      });

      it('should display lab visualizations in add panel', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        const exists = await dashboardAddPanel.panelAddLinkExists(LAB_VIS_NAME);
        await dashboardAddPanel.closeAddPanel();
        expect(exists).to.be(true);
      });

      it('should display lab visualizations in editor menu', async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        for (const dataTestSubj of experimentalTypes) {
          await testSubjects.existOrFail(dataTestSubj);
        }
      });

      describe('is false', () => {
        before(async () => {
          await PageObjects.header.clickStackManagement();
          await PageObjects.settings.clickKibanaSettings();
          await PageObjects.settings.toggleAdvancedSettingCheckbox(VISUALIZE_ENABLE_LABS_SETTING);
        });

        it('should not display lab visualizations in add panel', async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.clickNewDashboard();

          const exists = await dashboardAddPanel.panelAddLinkExists(LAB_VIS_NAME);
          await dashboardAddPanel.closeAddPanel();
          expect(exists).to.be(false);
        });

        it('should not display lab visualizations in editor menu', async () => {
          await dashboardAddPanel.clickEditorMenuButton();
          for (const dataTestSubj of experimentalTypes) {
            expect(await testSubjects.exists(dataTestSubj)).to.be(false);
          }
        });

        after(async () => {
          await PageObjects.header.clickStackManagement();
          await PageObjects.settings.clickKibanaSettings();
          await PageObjects.settings.clearAdvancedSettings(VISUALIZE_ENABLE_LABS_SETTING);
          await PageObjects.header.clickDashboard();
        });
      });
    });
  });
}
