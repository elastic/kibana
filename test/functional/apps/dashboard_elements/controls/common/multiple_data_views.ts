/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const security = getService('security');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const { common, dashboard, dashboardControls } = getPageObjects([
    'dashboardControls',
    'dashboard',
    'console',
    'common',
    'header',
  ]);

  describe('Dashboard control group with multiple data views', () => {
    let controlIds: string[];

    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_sample_admin']);

      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
        'courier:ignoreFilterIfFieldNotInIndex': true,
      });

      await common.setTime({
        from: 'Apr 10, 2018 @ 00:00:00.000',
        to: 'Nov 15, 2018 @ 00:00:00.000',
      });

      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();

      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'kibana_sample_data_flights',
        fieldName: 'Carrier',
        title: 'Carrier',
      });

      await dashboardControls.createControl({
        controlType: RANGE_SLIDER_CONTROL,
        dataViewTitle: 'kibana_sample_data_flights',
        fieldName: 'AvgTicketPrice',
        title: 'Average Ticket Price',
      });

      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'logstash-*',
        fieldName: 'machine.os.raw',
        title: 'Operating System',
      });

      await dashboardControls.createControl({
        controlType: RANGE_SLIDER_CONTROL,
        dataViewTitle: 'logstash-*',
        fieldName: 'bytes',
        title: 'Bytes',
      });

      await dashboardAddPanel.addSavedSearch('logstash hits');

      controlIds = await dashboardControls.getAllControlIds();
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await security.testUser.restoreDefaults();
      await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    it('ignores global filters on controls using a data view without the filter field', async () => {
      await filterBar.addFilter({ field: 'Carrier', operation: 'exists' });

      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('4');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.validateRange('placeholder', controlIds[1], '100', '1200');

      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('5');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);

      await dashboardControls.validateRange('placeholder', controlIds[3], '0', '19979');
    });

    it('ignores controls on other controls and panels using a data view without the control field by default', async () => {
      await filterBar.removeFilter('Carrier');
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSelectOption('Kibana Airlines');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.validateRange('placeholder', controlIds[1], '100', '1196');

      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('5');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);

      await dashboardControls.validateRange('placeholder', controlIds[3], '0', '19979');

      const logstashSavedSearchPanel = await testSubjects.find('embeddedSavedSearchDocTable');
      expect(
        await (
          await logstashSavedSearchPanel.findByCssSelector('[data-document-number]')
        ).getAttribute('data-document-number')
      ).to.not.be('0');
    });

    it('applies global filters on controls using data view a without the filter field', async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': false });
      await common.navigateToApp('dashboard');
      await testSubjects.click('edit-unsaved-New-Dashboard');
      await filterBar.addFilter({ field: 'Carrier', operation: 'exists' });

      await Promise.all([
        dashboardControls.optionsListWaitForLoading(controlIds[0]),
        dashboardControls.rangeSliderWaitForLoading(controlIds[1]),
        dashboardControls.optionsListWaitForLoading(controlIds[2]),
        dashboardControls.rangeSliderWaitForLoading(controlIds[3]),
      ]);

      await dashboardControls.clearControlSelections(controlIds[0]);
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('4');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.validateRange('placeholder', controlIds[1], '100', '1200');

      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('0');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);

      await dashboardControls.validateRange('placeholder', controlIds[3], '0', '0');
    });

    it('applies global filters on controls using a data view without the filter field', async () => {
      await filterBar.removeFilter('Carrier');
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSelectOption('Kibana Airlines');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await dashboardControls.validateRange('placeholder', controlIds[1], '100', '1196');

      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('0');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);

      await dashboardControls.validateRange('placeholder', controlIds[3], '0', '0');

      const logstashSavedSearchPanel = await testSubjects.find('embeddedSavedSearchDocTable');
      expect(
        await (
          await logstashSavedSearchPanel.findByCssSelector('[data-document-number]')
        ).getAttribute('data-document-number')
      ).to.be('0');
    });
  });
}
