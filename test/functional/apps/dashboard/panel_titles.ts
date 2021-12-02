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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize', 'visEditor']);

  const dashboardName = 'Panel Title Test';

  describe.only('panel titles', function describeIndexTests() {
    before(async function () {
      await esArchiver.load('test/functional/fixtures/es_archiver/dashboard/current/kibana');
      // await kibanaServer.uiSettings.replace({
      //   defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      // });
      await PageObjects.common.navigateToApp('dashboard');
      //   await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard(dashboardName);
    });

    it('new panel has empty title', async () => {
      await PageObjects.dashboard.switchToEditMode();
      // await dashboardAddPanel.clickCreateNewLink();
      await dashboardAddPanel.addVisualization('Title test: Empty');

      return;
    });

    it('saving new panel with blank title clears "unsaved changes" badge', async () => {
      return;
    });

    it('custom title is correctly displayed in both edit and view mode', async () => {
      return;
    });

    it('hiding an individual panel title hides it in both edit and view mode', async () => {
      return;
    });

    it('setting a panel title to blank hides it in view mode', async () => {
      return;
    });

    it('setting a panel title to blank displays [no title] in edit mode', async () => {
      return;
    });

    it("linking a panel with a blank title to the library will set the panel's title to the library title", async () => {
      return;
    });

    it('linking a panel with a custom title to the library will keep the original title', async () => {
      return;
    });

    it('unlinking a panel will keep the current title', async () => {
      return;
    });
  });
}
