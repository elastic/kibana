/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const { dashboardControls, timePicker, common, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
    'header',
  ]);

  const DASHBOARD_NAME = 'Test Range Slider Control';

  describe('Range Slider Control', async () => {
    before(async () => {
      await security.testUser.setRoles([
        'kibana_admin',
        'kibana_sample_admin',
        'test_logstash_reader',
      ]);
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.navigateToApp('dashboard');
      await dashboardControls.enableControlsLab();
      await common.navigateToApp('dashboard');
      await dashboard.preserveCrossAppState();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setAbsoluteRange(
        'Oct 22, 2018 @ 00:00:00.000',
        'Dec 3, 2018 @ 00:00:00.000'
      );
      await dashboard.saveDashboard(DASHBOARD_NAME, { exitFromEditMode: false });
    });

    after(async () => {
      await dashboardControls.clearAllControls();
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.uiSettings.unset('defaultIndex');
      await security.testUser.restoreDefaults();
    });

    describe('create and edit', async () => {
      it('can create a new range slider control from a blank state', async () => {
        await dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'bytes',
          width: 'small',
        });
        expect(await dashboardControls.getControlsCount()).to.be(1);
        await dashboard.clearUnsavedChanges();
      });

      it('can select a range', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderSetLowerBound(firstId, '50');
        await dashboardControls.rangeSliderSetUpperBound(firstId, '100');
        await dashboardControls.validateRange('value', firstId, '50', '100');

        await dashboard.clearUnsavedChanges();
      });

      it('can add a second range list control with a non-default data view', async () => {
        await dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'kibana_sample_data_flights',
          fieldName: 'AvgTicketPrice',
          width: 'medium',
        });
        expect(await dashboardControls.getControlsCount()).to.be(2);
        const secondId = (await dashboardControls.getAllControlIds())[1];
        await dashboardControls.validateRange('placeholder', secondId, '100', '1200');

        await dashboardControls.rangeSliderSetLowerBound(secondId, '200');
        await dashboardControls.rangeSliderSetUpperBound(secondId, '1000');
        await dashboardControls.validateRange('value', secondId, '200', '1000');

        // data views should be properly propagated from the control group to the dashboard
        expect(await filterBar.getIndexPatterns()).to.be('logstash-*,kibana_sample_data_flights');
        await dashboard.clearUnsavedChanges();
      });

      it('edits title and size of an existing control and retains existing range selection', async () => {
        const secondId = (await dashboardControls.getAllControlIds())[1];
        const newTitle = 'Average ticket price';
        await dashboardControls.editExistingControl(secondId);
        await dashboardControls.controlEditorSetTitle(newTitle);
        await dashboardControls.controlEditorSetWidth('large');
        await dashboardControls.controlEditorSave();
        expect(await dashboardControls.doesControlTitleExist(newTitle)).to.be(true);
        await dashboardControls.validateRange('value', secondId, '200', '1000');
        await dashboard.clearUnsavedChanges();
      });

      it('can change data view and field of range slider control and clears existing selection', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(firstId);

        const saveButton = await testSubjects.find('control-editor-save');
        expect(await saveButton.isEnabled()).to.be(true);
        await dashboardControls.controlsEditorSetDataView('kibana_sample_data_flights');
        expect(await saveButton.isEnabled()).to.be(false);
        await dashboardControls.controlsEditorSetfield('dayOfWeek', RANGE_SLIDER_CONTROL);
        await dashboardControls.controlEditorSave();
        await dashboardControls.rangeSliderWaitForLoading();
        await dashboardControls.validateRange('placeholder', firstId, '0', '6');
        await dashboardControls.validateRange('value', firstId, '', '');

        // when creating a new filter, the ability to select a data view should be removed, because the dashboard now only has one data view
        await retry.try(async () => {
          await testSubjects.click('addFilter');
          const indexPatternSelectExists = await testSubjects.exists('filterIndexPatternsSelect');
          await filterBar.ensureFieldEditorModalIsClosed();
          expect(indexPatternSelectExists).to.be(false);
        });
        await dashboard.clearUnsavedChanges();
      });

      it('can enter lower bound selection from the number field', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderSetLowerBound(firstId, '1');
        const lowerBoundSelection = await dashboardControls.rangeSliderGetLowerBoundAttribute(
          firstId,
          'value'
        );
        expect(lowerBoundSelection).to.be('1');
      });

      it('can enter upper bound selection into the number field', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderSetUpperBound(firstId, '2');
        const upperBoundSelection = await dashboardControls.rangeSliderGetUpperBoundAttribute(
          firstId,
          'value'
        );
        expect(upperBoundSelection).to.be('2');
      });

      it('applies filter from the first control on the second control', async () => {
        await dashboardControls.rangeSliderWaitForLoading();
        const secondId = (await dashboardControls.getAllControlIds())[1];
        await dashboardControls.validateRange('placeholder', secondId, '100', '1000');
        await dashboard.clearUnsavedChanges();
      });

      it('can clear out selections by clicking the reset button', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderClearSelection(firstId);
        await dashboardControls.validateRange('value', firstId, '', '');
        await dashboardControls.rangeSliderEnsurePopoverIsClosed(firstId);
        await dashboard.clearUnsavedChanges();
      });

      it('making changes to range causes unsaved changes', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderSetLowerBound(firstId, '0');
        await dashboardControls.rangeSliderSetUpperBound(firstId, '3');
        await dashboardControls.rangeSliderWaitForLoading();
        await testSubjects.existOrFail('dashboardUnsavedChangesBadge');
      });

      it('changes to range can be discarded', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.validateRange('value', firstId, '0', '3');
        await dashboard.clickCancelOutOfEditMode();
        await dashboardControls.validateRange('value', firstId, '', '');
      });

      it('dashboard does not load with unsaved changes when changes are discarded', async () => {
        await dashboard.switchToEditMode();
        await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
      });

      it('deletes an existing control', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.removeExistingControl(firstId);
        expect(await dashboardControls.getControlsCount()).to.be(1);
        await dashboard.clearUnsavedChanges();
      });
    });

    describe('validation', async () => {
      it('displays error message when upper bound selection is less than lower bound selection', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderSetLowerBound(firstId, '500');
        await dashboardControls.rangeSliderSetUpperBound(firstId, '400');
      });

      it('disables range slider when no data available', async () => {
        await dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'bytes',
          width: 'small',
        });
        const secondId = (await dashboardControls.getAllControlIds())[1];
        await dashboardControls.rangeSliderOpenPopover(secondId);
        await dashboardControls.rangeSliderPopoverAssertOpen();
        expect(
          await dashboardControls.rangeSliderGetDualRangeAttribute(secondId, 'disabled')
        ).to.be('true');
        expect((await testSubjects.getVisibleText('rangeSlider__helpText')).length).to.be.above(0);
      });
    });
  });
}
