/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
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
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await testSubjects.existOrFail('controls-empty');
      });

      it('adding control hides the empty control callout', async () => {
        await dashboardControls.createOptionsListControl({
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        await testSubjects.missingOrFail('controls-empty');
      });

      after(async () => {
        await dashboard.clickCancelOutOfEditMode();
        await dashboard.gotoDashboardLandingPage();
      });
    });
  });
}
