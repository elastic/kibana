/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'settings']);
  const a11y = getService('a11y');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const inspector = getService('inspector');

  describe('Dashboard Panel', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await testSubjects.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');
    });

    it('dashboard panel open ', async () => {
      const header = await dashboardPanelActions.getPanelHeading('[Flights] Flight count');
      await dashboardPanelActions.toggleContextMenu(header);
      await a11y.testAppSnapshot();
      // doing this again will close the Context Menu, so that next snapshot can start clean.
      await dashboardPanelActions.toggleContextMenu(header);
    });

    it('dashboard panel inspect', async () => {
      await dashboardPanelActions.openInspectorByTitle('[Flights] Flight count');
      await a11y.testAppSnapshot();
    });

    it('dashboard panel inspector view chooser ', async () => {
      await testSubjects.click('inspectorViewChooser');
      await a11y.testAppSnapshot();
      await testSubjects.click('inspectorViewChooser');
    });

    it('dashboard panel inspector request statistics ', async () => {
      await inspector.openInspectorRequestsView();
      await a11y.testAppSnapshot();
    });

    it('dashboard panel inspector request', async () => {
      await testSubjects.click('inspectorRequestDetailRequest');
      await a11y.testAppSnapshot();
    });

    it('dashboard panel inspector response', async () => {
      await testSubjects.click('inspectorRequestDetailResponse');
      await a11y.testAppSnapshot();
      await inspector.close();
    });

    it('dashboard panel full screen', async () => {
      const header = await dashboardPanelActions.getPanelHeading('[Flights] Flight count');
      await dashboardPanelActions.openContextMenuMorePanel(header);

      await testSubjects.click('embeddablePanelAction-togglePanel');
      await a11y.testAppSnapshot();
    });
  });
}
