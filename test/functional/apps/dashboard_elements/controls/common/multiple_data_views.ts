/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const security = getService('security');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const { dashboard, dashboardControls } = getPageObjects([
    'dashboardControls',
    'dashboard',
    'console',
    'header',
  ]);

  describe('Dashboard control group with multiple data views', () => {
    // Controls from flights data view
    const carrierControlId = '265b6a28-9ccb-44ae-83c9-3d7a7cac1961';
    const ticketPriceControlId = 'ed2b93e2-da37-482b-ae43-586a41cc2399';
    // Controls from logstash-* data view
    const osControlId = '5e1b146b-8a8b-4117-9218-c4aeaee7bc9a';
    const bytesControlId = 'c4760951-e793-45d5-a6b7-c72c145af7f9';

    async function waitForAllConrolsLoading() {
      await Promise.all([
        dashboardControls.optionsListWaitForLoading(carrierControlId),
        dashboardControls.rangeSliderWaitForLoading(ticketPriceControlId),
        dashboardControls.optionsListWaitForLoading(osControlId),
        dashboardControls.rangeSliderWaitForLoading(bytesControlId),
      ]);
    }

    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_sample_admin']);

      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/multi_data_view_kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/multi_data_view_kibana'
      );
      await security.testUser.restoreDefaults();
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    describe('courier:ignoreFilterIfFieldNotInIndex enabled', () => {
      before(async () => {
        await kibanaServer.uiSettings.replace({
          'courier:ignoreFilterIfFieldNotInIndex': true,
        });

        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('Test Control Group With Multiple Data Views');
      });

      after(async () => {
        await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      });

      describe('global filters', () => {
        before(async () => {
          await filterBar.addFilter({
            field: 'Carrier',
            operation: 'is',
            value: 'Kibana Airlines',
          });
          await waitForAllConrolsLoading();
        });

        after(async () => {
          await dashboard.clickDiscardChanges();
        });

        it('applies global filters to controls with data view of filter field', async () => {
          await dashboardControls.optionsListOpenPopover(carrierControlId);
          expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('1');
          await dashboardControls.optionsListEnsurePopoverIsClosed(carrierControlId);

          await dashboardControls.validateRange('placeholder', ticketPriceControlId, '100', '1196');
        });

        it('ignores global filters to controls without data view of filter field', async () => {
          await dashboardControls.optionsListOpenPopover(osControlId);
          expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('5');
          await dashboardControls.optionsListEnsurePopoverIsClosed(osControlId);

          await dashboardControls.validateRange('placeholder', bytesControlId, '0', '19979');
        });
      });

      describe('control filters', () => {
        before(async () => {
          await dashboardControls.optionsListOpenPopover(carrierControlId);
          await dashboardControls.optionsListPopoverSelectOption('Kibana Airlines');
          await dashboardControls.optionsListEnsurePopoverIsClosed(carrierControlId);
          await waitForAllConrolsLoading();
        });

        after(async () => {
          await dashboard.clickDiscardChanges();
        });

        it('applies control filters to controls with data view of control filter', async () => {
          await dashboardControls.validateRange('placeholder', ticketPriceControlId, '100', '1196');
        });

        it('ignores control filters on controls without data view of control filter', async () => {
          await dashboardControls.optionsListOpenPopover(osControlId);
          expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('5');
          await dashboardControls.optionsListEnsurePopoverIsClosed(osControlId);

          await dashboardControls.validateRange('placeholder', bytesControlId, '0', '19979');
        });

        it('ignores control filters on panels without data view of control filter', async () => {
          const logstashSavedSearchPanel = await testSubjects.find('embeddedSavedSearchDocTable');
          expect(
            await (
              await logstashSavedSearchPanel.findByCssSelector('[data-document-number]')
            ).getAttribute('data-document-number')
          ).to.not.be('0');
        });
      });
    });

    describe('courier:ignoreFilterIfFieldNotInIndex disabled', () => {
      before(async () => {
        await kibanaServer.uiSettings.replace({
          'courier:ignoreFilterIfFieldNotInIndex': false,
        });

        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('Test Control Group With Multiple Data Views');
      });

      after(async () => {
        await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      });

      describe('global filters', () => {
        before(async () => {
          await filterBar.addFilter({
            field: 'Carrier',
            operation: 'is',
            value: 'Kibana Airlines',
          });
          await waitForAllConrolsLoading();
        });

        after(async () => {
          await dashboard.clickDiscardChanges();
        });

        it('applies global filters to controls without data view of filter field', async () => {
          await dashboardControls.optionsListOpenPopover(osControlId);
          expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('0');
          await dashboardControls.optionsListEnsurePopoverIsClosed(osControlId);

          await dashboardControls.validateRange(
            'placeholder',
            bytesControlId,
            '-Infinity',
            'Infinity'
          );
        });
      });

      describe('control filters', () => {
        before(async () => {
          await dashboardControls.optionsListOpenPopover(carrierControlId);
          await dashboardControls.optionsListPopoverSelectOption('Kibana Airlines');
          await dashboardControls.optionsListEnsurePopoverIsClosed(carrierControlId);
          await waitForAllConrolsLoading();
        });

        after(async () => {
          await dashboard.clickDiscardChanges();
        });

        it('applies control filters on controls without data view of control filter', async () => {
          await dashboardControls.optionsListOpenPopover(osControlId);
          expect(await dashboardControls.optionsListGetCardinalityValue()).to.be('0');
          await dashboardControls.optionsListEnsurePopoverIsClosed(osControlId);

          await dashboardControls.validateRange(
            'placeholder',
            bytesControlId,
            '-Infinity',
            'Infinity'
          );
        });

        it('applies control filters on panels without data view of control filter', async () => {
          const logstashSavedSearchPanel = await testSubjects.find('embeddedSavedSearchDocTable');
          expect(
            await (
              await logstashSavedSearchPanel.findByCssSelector('[data-document-number]')
            ).getAttribute('data-document-number')
          ).to.be('0');
        });
      });
    });
  });
}
