/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'settings', 'common']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  describe('embeddable library', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('unlink panel from embeddable library', async () => {
      await PageObjects.dashboard.switchToEditMode();
      let firstPanel = await testSubjects.find('embeddablePanelHeading-RenderingTest:heatmap');
      const libraryAction = await testSubjects.findDescendant(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        firstPanel
      );
      await libraryAction.click();
      await testSubjects.click('libraryNotificationUnlinkButton');
      await testSubjects.existOrFail('unlinkPanelSuccess');

      firstPanel = await testSubjects.find('embeddablePanelHeading-RenderingTest:heatmap');
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        firstPanel
      );
      expect(libraryActionExists).to.be(false);
    });

    it('save panel to embeddable library', async () => {
      const originalPanel = await testSubjects.find('embeddablePanelHeading-RenderingTest:heatmap');
      const menuIcon = await testSubjects.findDescendant(
        'embeddablePanelToggleMenuIcon',
        originalPanel
      );
      await menuIcon.click();
      await testSubjects.click('embeddablePanelMore-mainMenu');
      await testSubjects.click('embeddablePanelAction-addToFromLibrary');
      await testSubjects.setValue('savedObjectTitle', 'Rendering Test: heatmap - copy', {
        clearWithKeyboard: true,
      });
      await testSubjects.click('confirmSaveSavedObjectButton');
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
