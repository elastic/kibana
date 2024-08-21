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
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const { dashboardControls, dashboard, timePicker } = getPageObjects([
    'dashboardControls',
    'dashboard',
    'timePicker',
  ]);

  describe.only('Dashboard control group settings', () => {
    before(async () => {
      await dashboard.loadSavedDashboard('control group settings test dashboard');
    });

    describe('filtering settings', async () => {
      let firstOptionsListId: string;
      let beforeCount: number;

      let rangeSliderId: string;
      let beforeRange: number;

      const getRange = async () => {
        await dashboardControls.rangeSliderWaitForLoading(rangeSliderId);
        const lower =
          (await dashboardControls.rangeSliderGetLowerBoundAttribute(
            rangeSliderId,
            'placeholder'
          )) ?? '0';
        const upper =
          (await dashboardControls.rangeSliderGetUpperBoundAttribute(
            rangeSliderId,
            'placeholder'
          )) ?? '0';
        return parseInt(upper, 10) - parseInt(lower, 10);
      };

      before(async () => {
        firstOptionsListId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.optionsListWaitForLoading(firstOptionsListId);
        await dashboardControls.optionsListOpenPopover(firstOptionsListId);
        beforeCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();

        rangeSliderId = (await dashboardControls.getAllControlIds())[2];
        beforeRange = await getRange();
      });

      describe('do not apply global filters', async () => {
        it('- filter pills', async () => {
          await filterBar.addFilter({ field: 'animal.keyword', operation: 'is', value: 'cat' });
          await dashboardControls.optionsListOpenPopover(firstOptionsListId);
          let afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
          expect(afterCount).to.be.lessThan(beforeCount);
          await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);

          await dashboardControls.updateFilterSyncSetting(false);
          await dashboardControls.optionsListOpenPopover(firstOptionsListId);
          afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
          expect(afterCount).to.be.equal(beforeCount);

          await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);
          await filterBar.removeAllFilters();
        });

        it('- query', async () => {
          await queryBar.setQuery('weightLbs < 40');
          await queryBar.submitQuery();
          let afterRange = await getRange();
          expect(afterRange).to.be.equal(beforeRange);
          await dashboardControls.rangeSliderEnsurePopoverIsClosed(rangeSliderId);

          await dashboardControls.updateFilterSyncSetting(true);
          afterRange = await getRange();
          expect(afterRange).to.be.lessThan(beforeRange);
          await dashboardControls.rangeSliderEnsurePopoverIsClosed(rangeSliderId);
          await queryBar.clearQuery();
          await queryBar.submitQuery();
        });
      });

      it('do not apply time range', async () => {
        await timePicker.setCommonlyUsedTime('Today');
        await dashboardControls.optionsListOpenPopover(firstOptionsListId);
        let afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
        expect(afterCount).to.be.equal(0);
        await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);

        await dashboardControls.updateTimeRangeSyncSetting(false);
        await dashboardControls.optionsListOpenPopover(firstOptionsListId);
        afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
        expect(afterCount).to.be.equal(beforeCount);
        await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);
        await timePicker.setDefaultDataRange();
        await dashboardControls.updateTimeRangeSyncSetting(true);
      });
    });

    describe('flyout only show settings that are relevant', async () => {
      before(async () => {
        await dashboard.switchToEditMode();
      });

      it('when no controls', async () => {
        await dashboardControls.deleteAllControls();
        await dashboardControls.openControlGroupSettingsFlyout();
        await testSubjects.missingOrFail('delete-all-controls-button');
      });

      it('when at least one control', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        await dashboardControls.openControlGroupSettingsFlyout();
        await testSubjects.existOrFail('delete-all-controls-button');
      });

      afterEach(async () => {
        await testSubjects.click('euiFlyoutCloseButton');
        if (await testSubjects.exists('confirmModalConfirmButton')) {
          await testSubjects.click('confirmModalConfirmButton');
        }
      });

      after(async () => {
        await dashboardControls.deleteAllControls();
      });
    });

    describe('control group settings flyout closes', async () => {
      it('on save', async () => {
        await dashboardControls.openControlGroupSettingsFlyout();
        await dashboard.saveDashboard('Test Control Group Settings', {
          saveAsNew: false,
          exitFromEditMode: false,
        });
        await testSubjects.missingOrFail('control-group-settings-flyout');
      });

      it('on view mode change', async () => {
        await dashboardControls.openControlGroupSettingsFlyout();
        await dashboard.clickCancelOutOfEditMode();
        await testSubjects.missingOrFail('control-group-settings-flyout');
      });

      it('when navigating away from dashboard', async () => {
        await dashboard.switchToEditMode();
        await dashboardControls.openControlGroupSettingsFlyout();
        await dashboard.gotoDashboardLandingPage();
        await testSubjects.missingOrFail('control-group-settings-flyout');
      });

      after(async () => {
        await dashboard.loadSavedDashboard('Test Control Group Settings');
      });
    });
  });
}
