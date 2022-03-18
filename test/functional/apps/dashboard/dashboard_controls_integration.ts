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
  const security = getService('security');
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const find = getService('find');
  const { dashboardControls, timePicker, common, dashboard, header } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
    'header',
  ]);

  describe('Dashboard controls integration', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.navigateToApp('dashboard');
      await dashboardControls.enableControlsLab();
      await common.navigateToApp('dashboard');
      await dashboard.preserveCrossAppState();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Controls callout visibility', async () => {
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

    describe('Control group settings', async () => {
      before(async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await dashboard.saveDashboard('Test Control Group Settings');
      });

      it('adjust layout of controls', async () => {
        await dashboard.switchToEditMode();
        await dashboardControls.createOptionsListControl({
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        await dashboardControls.adjustControlsLayout('twoLine');
        const controlGroupWrapper = await testSubjects.find('controls-group-wrapper');
        expect(await controlGroupWrapper.elementHasClass('controlsWrapper--twoLine')).to.be(true);
      });

      describe('apply new default size', async () => {
        it('to new controls only', async () => {
          await dashboardControls.updateControlsSize('medium');
          await dashboardControls.createOptionsListControl({
            dataViewTitle: 'animals-*',
            fieldName: 'name.keyword',
          });

          const controlIds = await dashboardControls.getAllControlIds();
          const firstControl = await find.byXPath(`//div[@data-control-id="${controlIds[0]}"]`);
          expect(await firstControl.elementHasClass('controlFrameWrapper--medium')).to.be(false);
          const secondControl = await find.byXPath(`//div[@data-control-id="${controlIds[1]}"]`);
          expect(await secondControl.elementHasClass('controlFrameWrapper--medium')).to.be(true);
        });

        it('to all existing controls', async () => {
          await dashboardControls.createOptionsListControl({
            dataViewTitle: 'animals-*',
            fieldName: 'animal.keyword',
            width: 'large',
          });

          await dashboardControls.updateControlsSize('small', true);
          const controlIds = await dashboardControls.getAllControlIds();
          for (const id of controlIds) {
            const control = await find.byXPath(`//div[@data-control-id="${id}"]`);
            expect(await control.elementHasClass('controlFrameWrapper--small')).to.be(true);
          }
        });
      });

      describe('flyout only show settings that are relevant', async () => {
        before(async () => {
          await dashboard.switchToEditMode();
        });

        it('when no controls', async () => {
          await dashboardControls.deleteAllControls();
          await dashboardControls.openControlGroupSettingsFlyout();
          await testSubjects.missingOrFail('delete-all-controls-button');
          await testSubjects.missingOrFail('set-all-control-sizes-checkbox');
        });

        it('when at least one control', async () => {
          await dashboardControls.createOptionsListControl({
            dataViewTitle: 'animals-*',
            fieldName: 'sound.keyword',
          });
          await dashboardControls.openControlGroupSettingsFlyout();
          await testSubjects.existOrFail('delete-all-controls-button');
          await testSubjects.existOrFail('set-all-control-sizes-checkbox', { allowHidden: true });
        });

        afterEach(async () => {
          await testSubjects.click('euiFlyoutCloseButton');
        });

        after(async () => {
          await dashboardControls.deleteAllControls();
        });
      });

      after(async () => {
        await dashboard.clickCancelOutOfEditMode();
        await dashboard.gotoDashboardLandingPage();
      });
    });

    describe('Options List Control creation and editing experience', async () => {
      it('can add a new options list control from a blank state', async () => {
        await dashboard.clickNewDashboard();
        await timePicker.setDefaultDataRange();
        await dashboardControls.createOptionsListControl({ fieldName: 'machine.os.raw' });
        expect(await dashboardControls.getControlsCount()).to.be(1);
      });

      it('can add a second options list control with a non-default data view', async () => {
        await dashboardControls.createOptionsListControl({
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        expect(await dashboardControls.getControlsCount()).to.be(2);

        // data views should be properly propagated from the control group to the dashboard
        expect(await filterBar.getIndexPatterns()).to.be('logstash-*,animals-*');
      });

      it('renames an existing control', async () => {
        const secondId = (await dashboardControls.getAllControlIds())[1];

        const newTitle = 'wow! Animal sounds?';
        await dashboardControls.editExistingControl(secondId);
        await dashboardControls.controlEditorSetTitle(newTitle);
        await dashboardControls.controlEditorSave();
        expect(await dashboardControls.doesControlTitleExist(newTitle)).to.be(true);
      });

      it('can change the data view and field of an existing options list', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(firstId);

        await dashboardControls.optionsListEditorSetDataView('animals-*');
        await dashboardControls.optionsListEditorSetfield('animal.keyword');
        await dashboardControls.controlEditorSave();

        // when creating a new filter, the ability to select a data view should be removed, because the dashboard now only has one data view
        await testSubjects.click('addFilter');
        await testSubjects.missingOrFail('filterIndexPatternsSelect');
        await filterBar.ensureFieldEditorModalIsClosed();
      });

      it('deletes an existing control', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];

        await dashboardControls.removeExistingControl(firstId);
        expect(await dashboardControls.getControlsCount()).to.be(1);
      });

      after(async () => {
        const controlIds = await dashboardControls.getAllControlIds();
        for (const controlId of controlIds) {
          await dashboardControls.removeExistingControl(controlId);
        }
      });
    });

    describe('Interact with options list on dashboard', async () => {
      before(async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await dashboardControls.createOptionsListControl({
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
          title: 'Animal Sounds',
        });
      });

      it('Shows available options in options list', async () => {
        const controlIds = await dashboardControls.getAllControlIds();
        await dashboardControls.optionsListOpenPopover(controlIds[0]);
        await retry.try(async () => {
          expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(8);
        });
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);
      });

      it('Can search options list for available options', async () => {
        const controlIds = await dashboardControls.getAllControlIds();
        await dashboardControls.optionsListOpenPopover(controlIds[0]);
        await dashboardControls.optionsListPopoverSearchForOption('meo');
        await retry.try(async () => {
          expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(1);
          expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql(['meow']);
        });
        await dashboardControls.optionsListPopoverClearSearch();
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);
      });

      it('Applies dashboard query to options list control', async () => {
        await queryBar.setQuery('isDog : true ');
        await queryBar.submitQuery();
        await dashboard.waitForRenderComplete();
        await header.waitUntilLoadingHasFinished();

        const controlIds = await dashboardControls.getAllControlIds();
        await dashboardControls.optionsListOpenPopover(controlIds[0]);
        await retry.try(async () => {
          expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(5);
          expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
            'ruff',
            'bark',
            'grrr',
            'bow ow ow',
            'grr',
          ]);
        });

        await queryBar.setQuery('');
        await queryBar.submitQuery();
      });

      it('Applies dashboard filters to options list control', async () => {
        await filterBar.addFilter('sound.keyword', 'is one of', ['bark', 'bow ow ow', 'ruff']);
        await dashboard.waitForRenderComplete();
        await header.waitUntilLoadingHasFinished();

        const controlIds = await dashboardControls.getAllControlIds();
        await dashboardControls.optionsListOpenPopover(controlIds[0]);
        await retry.try(async () => {
          expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(3);
          expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
            'ruff',
            'bark',
            'bow ow ow',
          ]);
        });

        await filterBar.removeAllFilters();
      });

      it('Can select multiple available options', async () => {
        const controlIds = await dashboardControls.getAllControlIds();
        await dashboardControls.optionsListOpenPopover(controlIds[0]);
        await dashboardControls.optionsListPopoverSelectOption('hiss');
        await dashboardControls.optionsListPopoverSelectOption('grr');
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);
      });

      it('Selected options appear in control', async () => {
        const controlIds = await dashboardControls.getAllControlIds();
        const selectionString = await dashboardControls.optionsListGetSelectionsString(
          controlIds[0]
        );
        expect(selectionString).to.be('hiss, grr');
      });

      it('Applies options list control options to dashboard', async () => {
        await retry.try(async () => {
          expect(await pieChart.getPieSliceCount()).to.be(2);
        });
      });

      it('Applies options list control options to dashboard by default on open', async () => {
        await dashboard.gotoDashboardLandingPage();
        await header.waitUntilLoadingHasFinished();
        await dashboard.clickUnsavedChangesContinueEditing('New Dashboard');
        await header.waitUntilLoadingHasFinished();
        expect(await pieChart.getPieSliceCount()).to.be(2);

        const controlIds = await dashboardControls.getAllControlIds();
        const selectionString = await dashboardControls.optionsListGetSelectionsString(
          controlIds[0]
        );
        expect(selectionString).to.be('hiss, grr');
      });
    });
  });
}
