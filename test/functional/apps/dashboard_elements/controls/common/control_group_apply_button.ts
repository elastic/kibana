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
  const pieChart = getService('pieChart');
  const elasticChart = getService('elasticChart');

  const { dashboard, header, dashboardControls } = getPageObjects([
    'dashboardControls',
    'dashboard',
    'header',
  ]);

  describe('Dashboard control group apply button', () => {
    const optionsListId = '41827e70-5285-4d44-8375-4c498449b9a7';
    const rangeSliderId = '515e7b9f-4f1b-4a06-beec-763810e4951a';

    before(async () => {
      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('Test Control Group Apply Button');
      await dashboard.switchToEditMode();
      await elasticChart.setNewChartUiDebugFlag();
    });

    it('renabling auto-apply forces filters to be published', async () => {
      await dashboardControls.optionsListOpenPopover(optionsListId);
      await dashboardControls.optionsListPopoverSelectOption('cat');
      await dashboardControls.optionsListEnsurePopoverIsClosed(optionsListId);
      await header.waitUntilLoadingHasFinished();
      await dashboardControls.verifyApplyButtonEnabled();

      await dashboardControls.updateShowApplyButtonSetting(false);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();

      await dashboard.expectUnsavedChangesBadge();
      expect(await pieChart.getPieSliceCount()).to.be(4);
      await dashboard.clickDiscardChanges();
    });

    describe('options list selections', () => {
      it('making selection enables apply button', async () => {
        await dashboardControls.optionsListOpenPopover(optionsListId);
        await dashboardControls.optionsListPopoverSelectOption('cat');
        await dashboardControls.optionsListEnsurePopoverIsClosed(optionsListId);
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.verifyApplyButtonEnabled();
      });

      it('waits to apply filters until button is pressed', async () => {
        expect(await pieChart.getPieSliceCount()).to.be(5);

        await dashboardControls.clickApplyButton();
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        await dashboard.expectUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(4);
      });

      it('hitting dashboard resets selections + unapplies filters', async () => {
        await dashboardControls.optionsListOpenPopover(optionsListId);
        await dashboardControls.optionsListPopoverSelectOption('dog');
        await dashboardControls.optionsListEnsurePopoverIsClosed(optionsListId);
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.verifyApplyButtonEnabled();

        await dashboard.clickDiscardChanges();
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        await dashboard.expectMissingUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(5);
        expect(await dashboardControls.optionsListGetSelectionsString(optionsListId)).to.be('Any');
      });
    });

    describe('range slider selections', () => {
      it('making selection enables apply button', async () => {
        await dashboardControls.rangeSliderSetUpperBound(rangeSliderId, '30');
        await dashboardControls.verifyApplyButtonEnabled();
      });

      it('waits to apply filters until apply button is pressed', async () => {
        expect(await pieChart.getPieSliceCount()).to.be(5);

        await dashboardControls.clickApplyButton();
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        await dashboard.expectUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(4);
      });

      it('hitting dashboard resets selections + unapplies filters', async () => {
        await dashboardControls.rangeSliderSetLowerBound(rangeSliderId, '15');
        await dashboardControls.rangeSliderEnsurePopoverIsClosed(rangeSliderId);
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.verifyApplyButtonEnabled();

        await dashboard.clickDiscardChanges();
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        await dashboard.expectMissingUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(5);
        expect(
          await dashboardControls.rangeSliderGetLowerBoundAttribute(rangeSliderId, 'value')
        ).to.be('');
        expect(
          await dashboardControls.rangeSliderGetUpperBoundAttribute(rangeSliderId, 'value')
        ).to.be('');
      });
    });

    describe('time slider selections', () => {
      let valueBefore: string | null;

      before(async () => {
        valueBefore = await dashboardControls.getTimeSliceFromTimeSlider();
      });

      it('making selection enables apply button', async () => {
        await dashboardControls.gotoNextTimeSlice();
        await dashboardControls.gotoNextTimeSlice(); // go to an empty timeslice
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.verifyApplyButtonEnabled();
      });

      it('waits to apply timeslice until apply button is pressed', async () => {
        expect(await pieChart.getPieSliceCount()).to.be(5);

        await dashboardControls.clickApplyButton();
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        await dashboard.expectUnsavedChangesBadge();
        await pieChart.expectEmptyPieChart();
      });

      it('hitting dashboard resets selections + unapplies timeslice', async () => {
        await dashboardControls.gotoNextTimeSlice();
        await dashboardControls.verifyApplyButtonEnabled();

        await dashboard.clickDiscardChanges();
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        await dashboard.expectMissingUnsavedChangesBadge();
        expect(await pieChart.getPieSliceCount()).to.be(5);
        const valueNow = await dashboardControls.getTimeSliceFromTimeSlider();
        expect(valueNow).to.equal(valueBefore);
      });
    });
  });
}
