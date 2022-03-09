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
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('dashboard grid', function () {
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
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('move panel', () => {
      // Specific test after https://github.com/elastic/kibana/issues/14764 fix
      it('Can move panel from bottom to top row', async () => {
        const lastVisTitle = 'Rendering Test: datatable';
        const panelTitleBeforeMove = await dashboardPanelActions.getPanelHeading(lastVisTitle);
        const position1 = await panelTitleBeforeMove.getPosition();
        await browser.dragAndDrop(
          { location: panelTitleBeforeMove },
          { location: { x: -20, y: -450 } }
        );

        const panelTitleAfterMove = await dashboardPanelActions.getPanelHeading(lastVisTitle);
        const position2 = await panelTitleAfterMove.getPosition();

        expect(position1.y).to.be.greaterThan(position2.y);
      });
    });
  });
}
