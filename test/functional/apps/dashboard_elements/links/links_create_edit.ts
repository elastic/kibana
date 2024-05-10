/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const deployment = getService('deployment');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const { dashboardLinks, dashboard, common, header } = getPageObjects([
    'dashboardLinks',
    'dashboard',
    'common',
    'header',
  ]);

  async function createSomeLinks() {
    await dashboardLinks.addExternalLink(
      `${deployment.getHostPort()}/app/foo`,
      true,
      true,
      'Link to new tab'
    );
    await dashboardLinks.addExternalLink(`${deployment.getHostPort()}/app/bar`, false, true);

    await dashboardLinks.addDashboardLink(DASHBOARD_NAME);
    await dashboardLinks.addDashboardLink('links 001');
  }

  const DASHBOARD_NAME = 'Test Links panel';
  const LINKS_PANEL_NAME = 'Some links';

  describe('links panel create and edit', () => {
    describe('creation', async () => {
      before(async () => {
        await dashboard.navigateToApp();
        await dashboard.preserveCrossAppState();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await dashboard.saveDashboard(DASHBOARD_NAME, { exitFromEditMode: false });
        await dashboard.loadSavedDashboard(DASHBOARD_NAME);
        await dashboard.switchToEditMode();
      });

      it('can not add an external link that violates externalLinks.policy', async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAddNewEmbeddableLink('links');

        await dashboardLinks.setExternalUrlInput('https://danger.example.com');
        expect(await testSubjects.exists('links--linkDestination--error')).to.be(true);
        await dashboardLinks.clickLinkEditorCloseButton();
        await dashboardLinks.clickPanelEditorCloseButton();
      });

      it('can create a new by-reference links panel', async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAddNewEmbeddableLink('links');

        await createSomeLinks();
        await dashboardLinks.toggleSaveByReference(true);
        await dashboardLinks.clickPanelEditorSaveButton();

        await testSubjects.exists('savedObjectSaveModal');
        await testSubjects.setValue('savedObjectTitle', LINKS_PANEL_NAME);
        await testSubjects.click('confirmSaveSavedObjectButton');
        await common.waitForSaveModalToClose();
        await testSubjects.exists('addObjectToDashboardSuccess');

        expect(await testSubjects.existOrFail('links--component'));
        expect(await dashboardLinks.getNumberOfLinksInPanel()).to.equal(4);
        await dashboard.clickDiscardChanges();
      });

      describe('by-value links panel', async () => {
        it('can create a new by-value links panel', async () => {
          await dashboardAddPanel.clickEditorMenuButton();
          await dashboardAddPanel.clickAddNewEmbeddableLink('links');
          await dashboardLinks.setLayout('horizontal');
          await createSomeLinks();
          await dashboardLinks.toggleSaveByReference(false);
          await dashboardLinks.clickPanelEditorSaveButton();
          await testSubjects.exists('addObjectToDashboardSuccess');

          expect(await testSubjects.existOrFail('links--component'));
          expect(await dashboardLinks.getNumberOfLinksInPanel()).to.equal(4);
        });

        it('can save by-value links panel to the library', async () => {
          /** Navigate away to test non-extensible input */
          await dashboard.gotoDashboardLandingPage();
          await dashboard.clickUnsavedChangesContinueEditing(DASHBOARD_NAME);

          await dashboard.waitForRenderComplete();
          await dashboardPanelActions.legacySaveToLibrary('Some more links');
          await testSubjects.existOrFail('addPanelToLibrarySuccess');
        });

        after(async () => {
          await dashboard.clickDiscardChanges();
        });
      });
    });

    describe('editing', () => {
      it('can reorder links in an existing panel', async () => {
        await dashboard.loadSavedDashboard('links 001');
        await dashboard.switchToEditMode();

        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await dashboardLinks.expectPanelEditorFlyoutIsOpen();

        // Move the third link up one step
        await dashboardLinks.reorderLinks('link003', 3, 1, true);

        await dashboardLinks.clickPanelEditorSaveButton();
        await header.waitUntilLoadingHasFinished();

        // The second link in the component should be the link we moved
        const listGroup = await testSubjects.find('links--component--listGroup');
        const listItem = await listGroup.findByCssSelector(`li:nth-child(2)`);
        expect(await listItem.getVisibleText()).to.equal('links 003 - external');
      });

      it('can edit link in existing panel', async () => {
        await dashboard.loadSavedDashboard('links 001');
        await dashboard.switchToEditMode();

        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await dashboardLinks.expectPanelEditorFlyoutIsOpen();

        await dashboardLinks.editLinkByIndex(5);
        await testSubjects.exists('links--linkEditor--flyout');
        await testSubjects.setValue('links--linkEditor--linkLabel--input', 'to be deleted');
        await dashboardLinks.clickLinksEditorSaveButton();
        await dashboardLinks.clickPanelEditorSaveButton();

        await header.waitUntilLoadingHasFinished();
        const link = await testSubjects.find('dashboardLink--link005');
        expect(await link.getVisibleText()).to.equal('to be deleted');
      });

      it('can delete link from existing panel', async () => {
        await dashboard.loadSavedDashboard('links 001');
        await dashboard.switchToEditMode();

        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await dashboardLinks.expectPanelEditorFlyoutIsOpen();

        await dashboardLinks.deleteLinkByIndex(5);
        await dashboardLinks.clickPanelEditorSaveButton();

        await header.waitUntilLoadingHasFinished();
        expect(await dashboardLinks.getNumberOfLinksInPanel()).to.equal(4);
      });
    });
  });
}
