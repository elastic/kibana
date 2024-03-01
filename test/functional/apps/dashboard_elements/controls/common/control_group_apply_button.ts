/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const security = getService('security');
  const pieChart = getService('pieChart');
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');

  const { dashboard, dashboardControls, timePicker } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
  ]);

  describe('Dashboard control group hierarchical chaining', () => {
    let controlIds: string[];

    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);

      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();

      // populate an initial set of controls and get their ids.
      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'animal.keyword',
        title: 'Animal',
      });

      await dashboardControls.createControl({
        controlType: RANGE_SLIDER_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'weightLbs',
        title: 'Animal Name',
      });

      await dashboardControls.createTimeSliderControl();

      controlIds = await dashboardControls.getAllControlIds();
      await dashboardControls.updateShowApplyButtonSetting(true);

      await elasticChart.setNewChartUiDebugFlag();
      await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
      await dashboard.saveDashboard('Test Control Group Apply Button', { exitFromEditMode: false });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('options list', () => {
      let optionsListId: string;

      before(async () => {
        optionsListId = controlIds[0];
      });

      it('making selection enables apply button', async () => {
        await dashboardControls.verifyApplyButtonEnabled(false);
        await dashboardControls.optionsListOpenPopover(optionsListId);
        await dashboardControls.optionsListPopoverSelectOption('cat');
        await dashboardControls.optionsListEnsurePopoverIsClosed(optionsListId);
        await dashboardControls.verifyApplyButtonEnabled();
      });

      it('waits to apply selections until button is pressed', async () => {
        await dashboard.expectMissingUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(5);

        const applyButton = await testSubjects.find('controlGroup--applyFiltersButton');
        await applyButton.click();
        await dashboard.waitForRenderComplete();

        await dashboard.expectUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(4);
      });

      it('hitting dashboard resets selections + unapplies filters', async () => {
        await dashboardControls.optionsListOpenPopover(optionsListId);
        await dashboardControls.optionsListPopoverSelectOption('dog');
        await dashboardControls.optionsListEnsurePopoverIsClosed(optionsListId);
        await dashboardControls.verifyApplyButtonEnabled();

        await dashboard.clickDiscardChanges();
        await dashboard.waitForRenderComplete();

        expect(await pieChart.getPieSliceCount()).to.be(5);
        await dashboardControls.verifyApplyButtonEnabled(false);
        expect(await dashboardControls.optionsListGetSelectionsString(optionsListId)).to.be('Any');
      });
    });

    describe('range slider', () => {
      let rangeSliderId: string;

      before(async () => {
        rangeSliderId = controlIds[1];
      });

      it('making selection enables apply button', async () => {
        await dashboardControls.verifyApplyButtonEnabled(false);
        await dashboardControls.rangeSliderSetUpperBound(rangeSliderId, '30');
        await dashboardControls.verifyApplyButtonEnabled();
      });

      it('waits to apply filter until apply button is pressed', async () => {
        await dashboard.expectMissingUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(5);

        const applyButton = await testSubjects.find('controlGroup--applyFiltersButton');
        await applyButton.click();
        await dashboard.waitForRenderComplete();

        await dashboard.expectUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(4);
      });

      it('hitting dashboard resets selections + unapplies filters', async () => {
        await dashboardControls.rangeSliderSetLowerBound(rangeSliderId, '15');
        await dashboardControls.rangeSliderEnsurePopoverIsClosed(rangeSliderId);
        await dashboardControls.verifyApplyButtonEnabled();

        await dashboard.clickDiscardChanges();
        await dashboard.waitForRenderComplete();

        expect(await pieChart.getPieSliceCount()).to.be(5);
        await dashboardControls.verifyApplyButtonEnabled(false);
        expect(
          await dashboardControls.rangeSliderGetLowerBoundAttribute(rangeSliderId, 'value')
        ).to.be('');
        expect(
          await dashboardControls.rangeSliderGetUpperBoundAttribute(rangeSliderId, 'value')
        ).to.be('');
      });
    });

    describe('time slider', () => {
      let valueBefore: string;

      before(async () => {
        valueBefore = await dashboardControls.getTimeSliceFromTimeSlider();
      });

      it('making selection enables apply button', async () => {
        await dashboardControls.verifyApplyButtonEnabled(false);
        await dashboardControls.gotoNextTimeSlice();
        await dashboardControls.gotoNextTimeSlice(); // go to an empty timeslice
        await dashboardControls.verifyApplyButtonEnabled();
      });

      it('waits to apply timeslice until apply button is pressed', async () => {
        await dashboard.expectMissingUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(5);

        await dashboardControls.verifyApplyButtonEnabled();
        const applyButton = await testSubjects.find('controlGroup--applyFiltersButton');
        await applyButton.click();
        await dashboard.waitForRenderComplete();

        await dashboard.expectUnsavedChangesBadge();
        pieChart.expectEmptyPieChart();
      });

      it('hitting dashboard resets selections + unapplies timeslice', async () => {
        await dashboardControls.gotoNextTimeSlice();
        await dashboardControls.verifyApplyButtonEnabled();

        await dashboard.clickDiscardChanges();
        await dashboard.waitForRenderComplete();

        expect(await pieChart.getPieSliceCount()).to.be(5);
        await dashboardControls.verifyApplyButtonEnabled(false);
        const valueNow = await dashboardControls.getTimeSliceFromTimeSlider();
        expect(valueNow).to.equal(valueBefore);
      });
    });
  });
}
