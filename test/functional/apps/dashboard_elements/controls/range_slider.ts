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
        await dashboardControls.createRangeSliderControl({
          dataViewTitle: 'logstash-*',
          fieldName: 'bytes',
          width: 'small',
        });
        expect(await dashboardControls.getControlsCount()).to.be(1);
      });

      it('can add a second range list control with a non-default data view', async () => {
        await dashboardControls.createRangeSliderControl({
          dataViewTitle: 'kibana_sample_data_flights',
          fieldName: 'AvgTicketPrice',
          width: 'medium',
        });
        expect(await dashboardControls.getControlsCount()).to.be(2);
        const secondId = (await dashboardControls.getAllControlIds())[1];
        expect(
          await dashboardControls.rangeSliderGetLowerBoundAttribute(secondId, 'placeholder')
        ).to.be('100');
        expect(
          await dashboardControls.rangeSliderGetUpperBoundAttribute(secondId, 'placeholder')
        ).to.be('1200');
        // data views should be properly propagated from the control group to the dashboard
        expect(await filterBar.getIndexPatterns()).to.be('logstash-*,kibana_sample_data_flights');
      });

      it('renames an existing control', async () => {
        const secondId = (await dashboardControls.getAllControlIds())[1];
        const newTitle = 'Average ticket price';
        await dashboardControls.editExistingControl(secondId);
        await dashboardControls.controlEditorSetTitle(newTitle);
        await dashboardControls.controlEditorSave();
        expect(await dashboardControls.doesControlTitleExist(newTitle)).to.be(true);
      });

      it('can edit range slider control', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(firstId);
        await dashboardControls.controlsEditorSetDataView('kibana_sample_data_flights');
        await dashboardControls.controlsEditorSetfield('dayOfWeek');
        await dashboardControls.controlEditorSave();
        await dashboardControls.rangeSliderWaitForLoading();
        expect(
          await dashboardControls.rangeSliderGetLowerBoundAttribute(firstId, 'placeholder')
        ).to.be('0');
        expect(
          await dashboardControls.rangeSliderGetUpperBoundAttribute(firstId, 'placeholder')
        ).to.be('6');
        // when creating a new filter, the ability to select a data view should be removed, because the dashboard now only has one data view
        await retry.try(async () => {
          await testSubjects.click('addFilter');
          const indexPatternSelectExists = await testSubjects.exists('filterIndexPatternsSelect');
          await filterBar.ensureFieldEditorModalIsClosed();
          expect(indexPatternSelectExists).to.be(false);
        });
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
        const availableMin = await dashboardControls.rangeSliderGetLowerBoundAttribute(
          secondId,
          'placeholder'
        );
        expect(availableMin).to.be('100');
        const availabeMax = await dashboardControls.rangeSliderGetUpperBoundAttribute(
          secondId,
          'placeholder'
        );
        expect(availabeMax).to.be('1000');
      });

      it('can clear out selections by clicking the reset button', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderClearSelection(firstId);
        const lowerBoundSelection = await dashboardControls.rangeSliderGetLowerBoundAttribute(
          firstId,
          'value'
        );
        expect(lowerBoundSelection.length).to.be(0);
        const upperBoundSelection = await dashboardControls.rangeSliderGetUpperBoundAttribute(
          firstId,
          'value'
        );
        expect(upperBoundSelection.length).to.be(0);
      });

      it('deletes an existing control', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.removeExistingControl(firstId);
        expect(await dashboardControls.getControlsCount()).to.be(1);
      });
    });

    describe('validation', async () => {
      it('displays error message when upper bound selection is less than lower bound selection', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderSetLowerBound(firstId, '500');
        await dashboardControls.rangeSliderSetUpperBound(firstId, '400');
      });

      it('disables inputs when no data available', async () => {
        await dashboardControls.createRangeSliderControl({
          dataViewTitle: 'logstash-*',
          fieldName: 'bytes',
          width: 'small',
        });
        const secondId = (await dashboardControls.getAllControlIds())[1];
        expect(
          await dashboardControls.rangeSliderGetLowerBoundAttribute(secondId, 'disabled')
        ).to.be('true');
        expect(
          await dashboardControls.rangeSliderGetUpperBoundAttribute(secondId, 'disabled')
        ).to.be('true');
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
