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
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const { dashboardControls, timePicker, common, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
  ]);

  describe('Time Slider Control', async () => {
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

    describe('create and delete', async () => {
      it('can create a new time slider control from a blank state', async () => {
        await dashboardControls.createTimeSliderControl();
        expect(await dashboardControls.getControlsCount()).to.be(1);
      });

      it('can not add a second time slider control', async () => {
        await dashboardControls.openControlsMenu();
        const createTimeSliderButton = await testSubjects.find('controls-create-timeslider-button');
        expect(await createTimeSliderButton.getAttribute('disabled')).to.be('true');
      });

      it('can add a range list control', async () => {
        await dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'kibana_sample_data_flights',
          fieldName: 'AvgTicketPrice',
          width: 'medium',
        });
        expect(await dashboardControls.getControlsCount()).to.be(2);
        const secondId = (await dashboardControls.getAllControlIds())[1];
        await dashboardControls.validateRange('placeholder', secondId, '100', '1200');
      });

      it('applies filter from the first control on the second control', async () => {
        await dashboardControls.gotoNextTimeSlice();
        await dashboardControls.rangeSliderWaitForLoading();
        const secondId = (await dashboardControls.getAllControlIds())[1];
        await dashboardControls.validateRange('placeholder', secondId, '101', '1000');
      });

      it('deletes an existing control', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.removeExistingControl(firstId);
        expect(await dashboardControls.getControlsCount()).to.be(1);
      });
    });
  });
}
