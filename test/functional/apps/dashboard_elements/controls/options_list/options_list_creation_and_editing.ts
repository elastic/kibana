/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const { dashboardControls, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'settings',
    'console',
    'common',
    'header',
  ]);

  describe('Dashboard options list creation and editing', () => {
    before(async () => {
      await dashboard.ensureDashboardIsInEditMode();
    });

    after(async () => {
      await dashboardControls.deleteAllControls();
      await dashboard.clickQuickSave();
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
        await dashboard.waitForRenderComplete();
        await dashboardPanelActions.removePanelByTitle('Rendering Test: animal sounds pie');
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
        await dashboardControls.openCreateControlFlyout();
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(false)).to.eql(
          'animals-*'
        );
        await testSubjects.missingOrFail('field-picker-select-isDog');
        await dashboardControls.controlEditorCancel(true);
      });
    });
  });
}
