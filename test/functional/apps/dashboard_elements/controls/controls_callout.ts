/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const { dashboardControls, timePicker, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
    'header',
  ]);

  describe('Controls callout', () => {
    describe('callout visibility', async () => {
      before(async () => {
        await dashboard.gotoDashboardLandingPage();

        await dashboard.clickNewDashboard();
        await timePicker.setDefaultDataRange();
        await dashboard.saveDashboard('Test Controls Callout');
      });

      describe('does not show the empty control callout on an empty dashboard', async () => {
        before(async () => {
          const panelCount = await dashboard.getPanelCount();
          if (panelCount > 0) {
            const panels = await dashboard.getDashboardPanels();
            for (const panel of panels) {
              await dashboardPanelActions.removePanel(panel);
            }
            await dashboard.clickQuickSave();
          }
        });

        it('in view mode', async () => {
          await dashboard.clickCancelOutOfEditMode();
          await testSubjects.missingOrFail('controls-empty');
        });

        it('in edit mode', async () => {
          await dashboard.switchToEditMode();
          await testSubjects.missingOrFail('controls-empty');
        });
      });

      it('show the empty control callout on a dashboard with panels', async () => {
        await dashboard.switchToEditMode();
        const panelCount = await dashboard.getPanelCount();
        if (panelCount < 1) {
          await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        }
        await testSubjects.existOrFail('controls-empty');
      });

      it('adding control hides the empty control callout', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        await testSubjects.missingOrFail('controls-empty');
      });

      it('deleting all controls shows the emoty control callout again', async () => {
        await dashboardControls.deleteAllControls();
        await testSubjects.existOrFail('controls-empty');
      });

      it('hide callout when hide announcement setting is true', async () => {
        await dashboard.clickQuickSave();
        await dashboard.gotoDashboardLandingPage();
        await kibanaServer.uiSettings.update({ hideAnnouncements: true });
        await browser.refresh();

        await dashboard.loadSavedDashboard('Test Controls Callout');
        await dashboard.switchToEditMode();
        await testSubjects.missingOrFail('controls-empty');

        await kibanaServer.uiSettings.update({ hideAnnouncements: false });
      });

      after(async () => {
        await dashboard.clickCancelOutOfEditMode();
        await dashboard.gotoDashboardLandingPage();
      });
    });
  });
}
