/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS } from '../../../../page_objects/dashboard_page_controls';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { OPTIONS_LIST_DASHBOARD_NAME } from '.';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
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

  describe('Interactions between options list and dashboard', () => {
    let controlId: string;

    const returnToDashboard = async () => {
      await dashboard.navigateToApp();
      await header.waitUntilLoadingHasFinished();
      await elasticChart.setNewChartUiDebugFlag();
      await dashboard.loadSavedDashboard(OPTIONS_LIST_DASHBOARD_NAME);
      await dashboard.ensureDashboardIsInEditMode();
      await header.waitUntilLoadingHasFinished();
    };

    before(async () => {
      await dashboard.ensureDashboardIsInEditMode();
      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'sound.keyword',
      });
      controlId = (await dashboardControls.getAllControlIds())[0];
      await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
      await dashboard.clickQuickSave();
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await dashboardControls.deleteAllControls();
      await dashboardPanelActions.removePanelByTitle('Rendering Test: animal sounds pie');
      await dashboard.clickQuickSave();
    });

    describe('Applies query settings to controls', () => {
      it('Malformed query throws an error', async () => {
        await queryBar.setQuery('animal.keyword : "dog" error');
        await queryBar.submitQuery(); // quicker than clicking the submit button, but hides the time picker
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('control-frame-error');
      });

      it('Can recover from malformed query error', async () => {
        await queryBar.setQuery('animal.keyword : "dog"');
        await queryBar.submitQuery();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('control-frame-error');
      });

      it('Applies dashboard query to options list control', async () => {
        const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
          'ruff',
          'bark',
          'grrr',
          'bow ow ow',
          'grr',
        ]);
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: { ...suggestions, grr: suggestions.grr - 1 },
          invalidSelections: [],
        });
        await queryBar.setQuery('');
        await queryBar.clickQuerySubmitButton(); // slower than submitQuery but ensures that the time picker is visible for the next test
      });

      it('Applies dashboard time range to options list control', async () => {
        // set time range to time with no documents
        await timePicker.setAbsoluteRange(
          'Jan 1, 2017 @ 00:00:00.000',
          'Jan 1, 2017 @ 00:00:00.000'
        );
        await header.waitUntilLoadingHasFinished();

        await dashboardControls.optionsListOpenPopover(controlId);
        expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(0);
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        await timePicker.setDefaultDataRange();
      });

      describe('dashboard filters', () => {
        before(async () => {
          await filterBar.addFilter({
            field: 'sound.keyword',
            operation: 'is one of',
            value: ['bark', 'bow ow ow', 'ruff'],
          });
          await header.waitUntilLoadingHasFinished();
        });

        it('Applies dashboard filters to options list control', async () => {
          const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
            'ruff',
            'bark',
            'bow ow ow',
          ]);
          await dashboardControls.ensureAvailableOptionsEqual(controlId, {
            suggestions,
            invalidSelections: [],
          });
        });

        it('Does not apply disabled dashboard filters to options list control', async () => {
          await filterBar.toggleFilterEnabled('sound.keyword');
          await header.waitUntilLoadingHasFinished();
          await dashboardControls.ensureAvailableOptionsEqual(controlId, {
            suggestions: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS,
            invalidSelections: [],
          });
          await filterBar.toggleFilterEnabled('sound.keyword');
          await header.waitUntilLoadingHasFinished();
        });

        it('Negated filters apply to options control', async () => {
          await filterBar.toggleFilterNegated('sound.keyword');
          await header.waitUntilLoadingHasFinished();

          const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
            'hiss',
            'grrr',
            'meow',
            'growl',
            'grr',
          ]);
          await dashboardControls.ensureAvailableOptionsEqual(controlId, {
            suggestions,
            invalidSelections: [],
          });
        });

        after(async () => {
          await filterBar.removeAllFilters();
        });
      });
    });

    describe('Selections made in control apply to dashboard', () => {
      it('Shows available options in options list', async () => {
        await queryBar.setQuery('');
        await queryBar.submitQuery();
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS,
          invalidSelections: [],
        });
      });

      it('Can search options list for available options', async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSearchForOption('meo');
        await dashboardControls.ensureAvailableOptionsEqual(
          controlId,
          {
            suggestions: { meow: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.meow },
            invalidSelections: [],
          },
          true
        );
        await dashboardControls.optionsListPopoverClearSearch();
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      });

      it('Can search options list for available options case insensitive', async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSearchForOption('MEO');
        await dashboardControls.ensureAvailableOptionsEqual(
          controlId,
          {
            suggestions: { meow: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.meow },
            invalidSelections: [],
          },
          true
        );
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
        await dashboard.waitForRenderComplete();
        expect(await pieChart.getPieSliceCount()).to.be(2);
      });

      it('Applies options list control options to dashboard by default on open', async () => {
        await dashboard.gotoDashboardLandingPage();
        await header.waitUntilLoadingHasFinished();
        await dashboard.clickUnsavedChangesContinueEditing(OPTIONS_LIST_DASHBOARD_NAME);
        await dashboard.waitForRenderComplete();
        expect(await pieChart.getPieSliceCount()).to.be(2);

        const selectionString = await dashboardControls.optionsListGetSelectionsString(controlId);
        expect(selectionString).to.be('hiss, grr');
      });

      it('excluding selections has expected results', async () => {
        await dashboard.clickQuickSave();
        await header.waitUntilLoadingHasFinished();

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

      describe('discarding changes', () => {
        describe('changes can be discarded', () => {
          let selections = '';

          beforeEach(async () => {
            await dashboardControls.optionsListOpenPopover(controlId);
            await dashboardControls.optionsListPopoverSelectOption('bark');
            await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
            selections = await dashboardControls.optionsListGetSelectionsString(controlId);
            expect(selections).to.equal('hiss, grr, bark');
          });

          afterEach(async () => {
            selections = await dashboardControls.optionsListGetSelectionsString(controlId);
            expect(selections).to.equal('hiss, grr');
          });

          it('by clicking the discard changes button', async () => {
            await dashboard.clickDiscardChanges();
          });

          it('by switching to view mode', async () => {
            await dashboard.clickCancelOutOfEditMode();
          });
        });

        it('dashboard does not load with unsaved changes when changes are discarded', async () => {
          await dashboard.switchToEditMode();
          await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
        });
      });
    });

    describe('Test data view runtime field', () => {
      const FIELD_NAME = 'testRuntimeField';
      const FIELD_VALUES = {
        G:
          OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.growl +
          OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.grr +
          OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.grrr,
        H: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.hiss,
        B:
          OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.bark +
          OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS['bow ow ow'],
        R: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.ruff,
        M: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.meow,
      };

      before(async () => {
        await common.navigateToApp('settings');
        await settings.clickKibanaIndexPatterns();
        await settings.clickIndexPatternByName('animals-*');
        await settings.addRuntimeField(
          FIELD_NAME,
          'keyword',
          `emit(doc['sound.keyword'].value.substring(0, 1).toUpperCase())`
        );
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
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: FIELD_VALUES,
          invalidSelections: [],
        });
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

    describe('Test exists query', () => {
      const newDocuments: Array<{ index: string; id: string }> = [];

      const addDocument = async (index: string, document: string) => {
        await console.enterText('\nPOST ' + index + '/_doc/\n{\n ' + document + '\n}');
        await console.clickPlay();
        await header.waitUntilLoadingHasFinished();
        const response = JSON.parse(await console.getOutputText());
        newDocuments.push({ index, id: response._id });
      };

      before(async () => {
        await common.navigateToApp('console');
        await console.skipTourIfExists();
        await console.clearEditorText();
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
      });

      it('creating exists query has expected results', async () => {
        await dashboard.waitForRenderComplete();
        expect((await pieChart.getPieChartValues())[0]).to.be(6);
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSelectExists();
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
        await console.clearEditorText();
        for (const { index, id } of newDocuments) {
          await console.enterText(`\nDELETE /${index}/_doc/${id}`);
          await console.clickPlay();
          await header.waitUntilLoadingHasFinished();
        }
        await returnToDashboard();
      });
    });
  });
}
