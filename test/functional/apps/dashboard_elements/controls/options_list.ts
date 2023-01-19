/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const security = getService('security');
  const elasticChart = getService('elasticChart');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const { dashboardControls, timePicker, console, common, dashboard, header, settings } =
    getPageObjects([
      'dashboardControls',
      'timePicker',
      'dashboard',
      'settings',
      'console',
      'common',
      'header',
    ]);

  const DASHBOARD_NAME = 'Test Options List Control';

  describe('Dashboard options list integration', () => {
    const returnToDashboard = async () => {
      await common.navigateToApp('dashboard');
      await header.waitUntilLoadingHasFinished();
      await elasticChart.setNewChartUiDebugFlag();
      await dashboard.loadSavedDashboard(DASHBOARD_NAME);
      if (await dashboard.getIsInViewMode()) {
        await dashboard.switchToEditMode();
      }
      await dashboard.waitForRenderComplete();
    };

    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);

      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await elasticChart.setNewChartUiDebugFlag();
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        exitFromEditMode: false,
        storeTimeWithDashboard: true,
      });
    });

    describe('Options List Control Editor selects relevant data views', async () => {
      it('selects the default data view when the dashboard is blank', async () => {
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'logstash-*'
        );
      });

      it('selects a relevant data view based on the panels on the dashboard', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await dashboard.waitForRenderComplete();
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'animals-*'
        );
        await dashboardPanelActions.removePanelByTitle('Rendering Test: animal sounds pie');
        await dashboard.waitForRenderComplete();
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'logstash-*'
        );
      });

      it('selects the last used data view by default', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'animals-*'
        );
        await dashboardControls.deleteAllControls();
      });
    });

    // Skip on cloud until issue is fixed
    // Issue: https://github.com/elastic/kibana/issues/141280
    describe('Options List Control creation and editing experience', function () {
      this.tags(['skipCloudFailedTest']);
      it('can add a new options list control from a blank state', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'machine.os.raw',
        });
        expect(await dashboardControls.getControlsCount()).to.be(1);
        await dashboard.clearUnsavedChanges();
      });

      it('can add a second options list control with a non-default data view', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        expect(await dashboardControls.getControlsCount()).to.be(2);

        // data views should be properly propagated from the control group to the dashboard
        expect(await filterBar.getIndexPatterns()).to.be('logstash-*,animals-*');
        await dashboard.clearUnsavedChanges();
      });

      it('renames an existing control', async () => {
        const secondId = (await dashboardControls.getAllControlIds())[1];

        const newTitle = 'wow! Animal sounds?';
        await dashboardControls.editExistingControl(secondId);
        await dashboardControls.controlEditorSetTitle(newTitle);
        await dashboardControls.controlEditorSave();
        expect(await dashboardControls.doesControlTitleExist(newTitle)).to.be(true);
        await dashboard.clearUnsavedChanges();
      });

      it('can change the data view and field of an existing options list', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(firstId);

        const saveButton = await testSubjects.find('control-editor-save');
        expect(await saveButton.isEnabled()).to.be(true);
        await dashboardControls.controlsEditorSetDataView('animals-*');
        expect(await saveButton.isEnabled()).to.be(false);
        await dashboardControls.controlsEditorSetfield('animal.keyword', OPTIONS_LIST_CONTROL);
        await dashboardControls.controlEditorSave();

        // when creating a new filter, the ability to select a data view should be removed, because the dashboard now only has one data view
        await retry.try(async () => {
          await testSubjects.click('addFilter');
          const indexPatternSelectExists = await testSubjects.exists('filterIndexPatternsSelect');
          await filterBar.ensureFieldEditorModalIsClosed();
          expect(indexPatternSelectExists).to.be(false);
        });
        await dashboard.clearUnsavedChanges();
      });

      it('editing field clears selections', async () => {
        const secondId = (await dashboardControls.getAllControlIds())[1];
        await dashboardControls.optionsListOpenPopover(secondId);
        await dashboardControls.optionsListPopoverSelectOption('hiss');
        await dashboardControls.optionsListEnsurePopoverIsClosed(secondId);

        await dashboardControls.editExistingControl(secondId);
        await dashboardControls.controlsEditorSetfield('animal.keyword', OPTIONS_LIST_CONTROL);
        await dashboardControls.controlEditorSave();

        const selectionString = await dashboardControls.optionsListGetSelectionsString(secondId);
        expect(selectionString).to.be('Any');
      });

      it('editing other control settings keeps selections', async () => {
        const secondId = (await dashboardControls.getAllControlIds())[1];
        await dashboardControls.optionsListOpenPopover(secondId);
        await dashboardControls.optionsListPopoverSelectOption('dog');
        await dashboardControls.optionsListPopoverSelectOption('cat');
        await dashboardControls.optionsListEnsurePopoverIsClosed(secondId);

        await dashboardControls.editExistingControl(secondId);
        await dashboardControls.controlEditorSetTitle('Animal');
        await dashboardControls.controlEditorSetWidth('large');
        await dashboardControls.controlEditorSave();

        const selectionString = await dashboardControls.optionsListGetSelectionsString(secondId);
        expect(selectionString).to.be('dog, cat');
      });

      it('deletes an existing control', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];

        await dashboardControls.removeExistingControl(firstId);
        expect(await dashboardControls.getControlsCount()).to.be(1);
        await dashboard.clearUnsavedChanges();
      });

      it('cannot create options list for scripted field', async () => {
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'animals-*'
        );
        await dashboardControls.openCreateControlFlyout();
        await testSubjects.missingOrFail('field-picker-select-isDog');
        await dashboardControls.controlEditorCancel(true);
      });

      after(async () => {
        await dashboardControls.clearAllControls();
      });
    });

    describe('Interactions between options list and dashboard', async () => {
      let controlId: string;

      const allAvailableOptions = [
        'hiss',
        'ruff',
        'bark',
        'grrr',
        'meow',
        'growl',
        'grr',
        'bow ow ow',
      ];

      const ensureAvailableOptionsEql = async (expectation: string[], skipOpen?: boolean) => {
        if (!skipOpen) await dashboardControls.optionsListOpenPopover(controlId);
        await retry.try(async () => {
          expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql(
            expectation
          );
        });
        if (!skipOpen) await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      };

      before(async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
          title: 'Animal Sounds',
        });

        controlId = (await dashboardControls.getAllControlIds())[0];
      });

      describe('Applies query settings to controls', async () => {
        it('Applies dashboard query to options list control', async () => {
          await queryBar.setQuery('animal.keyword : "dog" ');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await ensureAvailableOptionsEql(['ruff', 'bark', 'grrr', 'bow ow ow', 'grr']);

          await queryBar.setQuery('');
          await queryBar.submitQuery();

          // using the query hides the time range. Clicking anywhere else shows it again.
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });

        it('Applies dashboard time range to options list control', async () => {
          // set time range to time with no documents
          await timePicker.setAbsoluteRange(
            'Jan 1, 2017 @ 00:00:00.000',
            'Jan 1, 2017 @ 00:00:00.000'
          );
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();

          await dashboardControls.optionsListOpenPopover(controlId);
          expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(0);
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await timePicker.setDefaultDataRange();
        });

        describe('dashboard filters', async () => {
          before(async () => {
            await filterBar.addFilter('sound.keyword', 'is one of', ['bark', 'bow ow ow', 'ruff']);
            await dashboard.waitForRenderComplete();
            await header.waitUntilLoadingHasFinished();
          });

          it('Applies dashboard filters to options list control', async () => {
            await ensureAvailableOptionsEql(['ruff', 'bark', 'bow ow ow']);
          });

          it('Does not apply disabled dashboard filters to options list control', async () => {
            await filterBar.toggleFilterEnabled('sound.keyword');
            await dashboard.waitForRenderComplete();
            await header.waitUntilLoadingHasFinished();

            await ensureAvailableOptionsEql(allAvailableOptions);

            await filterBar.toggleFilterEnabled('sound.keyword');
            await dashboard.waitForRenderComplete();
            await header.waitUntilLoadingHasFinished();
          });

          it('Negated filters apply to options control', async () => {
            await filterBar.toggleFilterNegated('sound.keyword');
            await dashboard.waitForRenderComplete();
            await header.waitUntilLoadingHasFinished();

            await ensureAvailableOptionsEql(['hiss', 'grrr', 'meow', 'growl', 'grr']);
          });

          after(async () => {
            await filterBar.removeAllFilters();
          });
        });
      });

      describe('Selections made in control apply to dashboard', async () => {
        it('Shows available options in options list', async () => {
          await queryBar.setQuery('');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();
          await retry.try(async () => {
            await ensureAvailableOptionsEql(allAvailableOptions);
          });
        });

        it('Can search options list for available options', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSearchForOption('meo');
          await ensureAvailableOptionsEql(['meow'], true);
          await dashboardControls.optionsListPopoverClearSearch();
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });

        it('Can search options list for available options case insensitive', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSearchForOption('MEO');
          await ensureAvailableOptionsEql(['meow'], true);
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
          await dashboard.clickUnsavedChangesContinueEditing(DASHBOARD_NAME);
          await header.waitUntilLoadingHasFinished();
          expect(await pieChart.getPieSliceCount()).to.be(2);

          const selectionString = await dashboardControls.optionsListGetSelectionsString(controlId);
          expect(selectionString).to.be('hiss, grr');
        });

        it('excluding selections has expected results', async () => {
          await dashboard.clickQuickSave();
          await dashboard.waitForRenderComplete();

          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSetIncludeSelections(false);
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await dashboard.waitForRenderComplete();

          expect(await pieChart.getPieSliceCount()).to.be(5);
          await dashboard.clearUnsavedChanges();
        });

        it('including selections has expected results', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSetIncludeSelections(true);
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await dashboard.waitForRenderComplete();

          expect(await pieChart.getPieSliceCount()).to.be(2);
          await dashboard.clearUnsavedChanges();
        });

        it('changes to selections can be discarded', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('bark');
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          let selections = await dashboardControls.optionsListGetSelectionsString(controlId);
          expect(selections).to.equal('hiss, grr, bark');

          await dashboard.clickCancelOutOfEditMode();
          selections = await dashboardControls.optionsListGetSelectionsString(controlId);
          expect(selections).to.equal('hiss, grr');
        });

        it('dashboard does not load with unsaved changes when changes are discarded', async () => {
          await dashboard.switchToEditMode();
          await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
        });
      });

      describe('test data view runtime field', async () => {
        const FIELD_NAME = 'testRuntimeField';
        const FIELD_VALUES = ['G', 'H', 'B', 'R', 'M'];

        before(async () => {
          await common.navigateToApp('settings');
          await settings.clickKibanaIndexPatterns();
          await settings.clickIndexPatternByName('animals-*');
          await settings.addRuntimeField(
            FIELD_NAME,
            'keyword',
            `emit(doc['sound.keyword'].value.substring(0, 1).toUpperCase())`
          );
          await header.waitUntilLoadingHasFinished();

          await returnToDashboard();
          await dashboardControls.deleteAllControls();
        });

        it('can create options list control on runtime field', async () => {
          await dashboardControls.createControl({
            controlType: OPTIONS_LIST_CONTROL,
            fieldName: FIELD_NAME,
            dataViewTitle: 'animals-*',
          });
          expect(await dashboardControls.getControlsCount()).to.be(1);
        });

        it('new control has expected suggestions', async () => {
          controlId = (await dashboardControls.getAllControlIds())[0];
          await ensureAvailableOptionsEql(FIELD_VALUES);
        });

        it('making selection has expected results', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('B');
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await dashboard.waitForRenderComplete();

          expect(await pieChart.getPieChartLabels()).to.eql(['bark', 'bow ow ow']);
        });

        after(async () => {
          await dashboardControls.deleteAllControls();
          await dashboard.clickQuickSave();
          await header.waitUntilLoadingHasFinished();

          await common.navigateToApp('settings');
          await settings.clickKibanaIndexPatterns();
          await settings.clickIndexPatternByName('animals-*');
          await settings.filterField('testRuntimeField');
          await testSubjects.click('deleteField');
          await settings.confirmDelete();
        });
      });

      describe('test exists query', async () => {
        const newDocuments: Array<{ index: string; id: string }> = [];

        const addDocument = async (index: string, document: string) => {
          await console.enterRequest('\nPOST ' + index + '/_doc/ \n{\n ' + document);
          await console.clickPlay();
          await header.waitUntilLoadingHasFinished();
          const response = JSON.parse(await console.getResponse());
          newDocuments.push({ index, id: response._id });
        };

        before(async () => {
          await common.navigateToApp('console');
          await console.collapseHelp();
          await console.clearTextArea();
          await addDocument(
            'animals-cats-2018-01-01',
            '"@timestamp": "2018-01-01T16:00:00.000Z", \n"name": "Rosie", \n"sound": "hiss"'
          );
          await returnToDashboard();

          await dashboardControls.createControl({
            controlType: OPTIONS_LIST_CONTROL,
            dataViewTitle: 'animals-*',
            fieldName: 'animal.keyword',
            title: 'Animal',
          });
          controlId = (await dashboardControls.getAllControlIds())[0];
          await header.waitUntilLoadingHasFinished();
          await dashboard.waitForRenderComplete();
        });

        it('creating exists query has expected results', async () => {
          expect((await pieChart.getPieChartValues())[0]).to.be(6);
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('exists');
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await dashboard.waitForRenderComplete();

          expect(await pieChart.getPieSliceCount()).to.be(5);
          expect((await pieChart.getPieChartValues())[0]).to.be(5);
        });

        it('negating exists query has expected results', async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSetIncludeSelections(false);
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await dashboard.waitForRenderComplete();

          expect(await pieChart.getPieSliceCount()).to.be(1);
          expect((await pieChart.getPieChartValues())[0]).to.be(1);
        });

        after(async () => {
          await common.navigateToApp('console');
          await console.clearTextArea();
          for (const { index, id } of newDocuments) {
            await console.enterRequest(`\nDELETE /${index}/_doc/${id}`);
            await console.clickPlay();
            await header.waitUntilLoadingHasFinished();
          }

          await returnToDashboard();
          await dashboardControls.deleteAllControls();
        });
      });

      describe('Options List dashboard validation', async () => {
        before(async () => {
          await dashboardControls.createControl({
            controlType: OPTIONS_LIST_CONTROL,
            dataViewTitle: 'animals-*',
            fieldName: 'sound.keyword',
            title: 'Animal Sounds',
          });
          controlId = (await dashboardControls.getAllControlIds())[0];

          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('meow');
          await dashboardControls.optionsListPopoverSelectOption('bark');
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        });

        after(async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverClearSelections();
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await filterBar.removeAllFilters();
        });

        it('Can mark selections invalid with Query', async () => {
          await queryBar.setQuery('NOT animal.keyword : "dog" ');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();
          await ensureAvailableOptionsEql([
            'hiss',
            'meow',
            'growl',
            'grr',
            'Ignored selection',
            'bark',
          ]);

          // only valid selections are applied as filters.
          expect(await pieChart.getPieSliceCount()).to.be(1);
        });

        it('can make invalid selections valid again if the parent filter changes', async () => {
          await queryBar.setQuery('');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();
          await ensureAvailableOptionsEql(allAvailableOptions);
          expect(await pieChart.getPieSliceCount()).to.be(2);
        });

        it('Can mark multiple selections invalid with Filter', async () => {
          await filterBar.addFilter('sound.keyword', 'is', ['hiss']);
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();
          await ensureAvailableOptionsEql(['hiss', 'Ignored selections', 'meow', 'bark']);

          // only valid selections are applied as filters.
          expect(await pieChart.getPieSliceCount()).to.be(1);
        });
      });

      describe('Options List dashboard no validation', async () => {
        before(async () => {
          await filterBar.removeAllFilters();
          await queryBar.clickQuerySubmitButton();
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('meow');
          await dashboardControls.optionsListPopoverSelectOption('bark');
          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          await dashboardControls.updateValidationSetting(false);
        });

        it('Does not mark selections invalid with Query', async () => {
          await queryBar.setQuery('NOT animal.keyword : "dog" ');
          await queryBar.submitQuery();
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();
          await ensureAvailableOptionsEql(['hiss', 'meow', 'growl', 'grr']);
        });

        it('Does not mark multiple selections invalid with Filter', async () => {
          await filterBar.addFilter('sound.keyword', 'is', ['hiss']);
          await dashboard.waitForRenderComplete();
          await header.waitUntilLoadingHasFinished();
          await ensureAvailableOptionsEql(['hiss']);
        });
      });

      after(async () => {
        await filterBar.removeAllFilters();
        await queryBar.clickQuerySubmitButton();
        await dashboardControls.clearAllControls();
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });
  });
}
