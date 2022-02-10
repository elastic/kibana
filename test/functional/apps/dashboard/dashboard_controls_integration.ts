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
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const { dashboardControls, timePicker, common, dashboard, header } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
    'header',
  ]);

  describe('Dashboard controls integration', () => {
    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/dashboard/current/kibana');
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.navigateToApp('dashboard');
      await dashboardControls.enableControlsLab();
      await common.navigateToApp('dashboard');
      await dashboard.preserveCrossAppState();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
    });

    it('shows the empty control callout on a new dashboard', async () => {
      await testSubjects.existOrFail('controls-empty');
    });

    describe('Options List Control creation and editing experience', async () => {
      it('can add a new options list control from a blank state', async () => {
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
      let controlId: string;
      before(async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');

        await dashboardControls.createOptionsListControl({
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
          title: 'Animal Sounds',
        });

        controlId = (await dashboardControls.getAllControlIds())[0];
      });

      describe('Apply dashboard query and filters to controls', async () => {
        it('Applies dashboard query to options list control', async () => {
          await queryBar.setQuery('isDog : true ');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await dashboardControls.optionsListOpenPopover(controlId);
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

          await dashboardControls.optionsListOpenPopover(controlId);
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(3);
            expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
              'ruff',
              'bark',
              'bow ow ow',
            ]);
          });
        });

        it('Does not apply disabled dashboard filters to options list control', async () => {
          await filterBar.toggleFilterEnabled('sound.keyword');
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await dashboardControls.optionsListOpenPopover(controlId);
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(8);
          });

          await filterBar.toggleFilterEnabled('sound.keyword');
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();
        });

        it('Negated filters apply to options control', async () => {
          await filterBar.toggleFilterNegated('sound.keyword');
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await dashboardControls.optionsListOpenPopover(controlId);
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(5);
            expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
              'hiss',
              'grrr',
              'meow',
              'growl',
              'grr',
            ]);
          });
        });

        after(async () => {
          await filterBar.removeAllFilters();
        });
      });

      describe('Selections made in control apply to dashboard', async () => {
        it('Shows available options in options list', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(8);
          });
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });

        it('Can search options list for available options', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSearchForOption('meo');
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(1);
            expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
              'meow',
            ]);
          });
          await dashboardControls.optionsListPopoverClearSearch();
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });

        it('Can select multiple available options', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('hiss');
          await dashboardControls.optionsListPopoverSelectOption('grr');
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });

        it('Selected options appear in control', async () => {
          const selectionString = await dashboardControls.optionsListGetSelectionsString(controlId);
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

          const selectionString = await dashboardControls.optionsListGetSelectionsString(controlId);
          expect(selectionString).to.be('hiss, grr');
        });

        after(async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverClearSelections();
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });
      });

      describe('Options List validation', async () => {
        before(async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('meow');
          await dashboardControls.optionsListPopoverSelectOption('bark');
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });

        it('Can mark selections invalid with Query', async () => {
          await queryBar.setQuery('isDog : false ');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await dashboardControls.optionsListOpenPopover(controlId);
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(4);
            expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
              'hiss',
              'meow',
              'growl',
              'grr',
              'Ignored selection',
              'bark',
            ]);
          });
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          // only valid selections are applied as filters.
          expect(await pieChart.getPieSliceCount()).to.be(1);
        });

        it('can make invalid selections valid again if the parent filter changes', async () => {
          await queryBar.setQuery('');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await dashboardControls.optionsListOpenPopover(controlId);
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(8);
            expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
              'hiss',
              'ruff',
              'bark',
              'grrr',
              'meow',
              'growl',
              'grr',
              'bow ow ow',
            ]);
          });

          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          expect(await pieChart.getPieSliceCount()).to.be(2);
        });

        it('Can mark multiple selections invalid with Filter', async () => {
          await filterBar.addFilter('sound.keyword', 'is', ['hiss']);
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await dashboardControls.optionsListOpenPopover(controlId);
          await retry.try(async () => {
            expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(1);
            expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql([
              'hiss',
              'Ignored selections',
              'meow',
              'bark',
            ]);
          });

          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          // only valid selections are applied as filters.
          expect(await pieChart.getPieSliceCount()).to.be(1);
        });
      });
    });
  });
}
