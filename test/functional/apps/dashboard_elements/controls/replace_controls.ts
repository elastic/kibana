/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-plugin/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const { dashboardControls, timePicker, common, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
    'header',
  ]);

  const changeFieldType = async (newField: string) => {
    const saveButton = await testSubjects.find('control-editor-save');
    expect(await saveButton.isEnabled()).to.be(false);
    await dashboardControls.controlsEditorSetfield(newField);
    expect(await saveButton.isEnabled()).to.be(true);
    await dashboardControls.controlEditorSave();
  };

  const replaceWithOptionsList = async (controlId: string) => {
    await dashboardControls.controlEditorSetType(OPTIONS_LIST_CONTROL);
    await changeFieldType('sound.keyword');
    await testSubjects.waitForEnabled(`optionsList-control-${controlId}`);
    await dashboardControls.verifyControlType(controlId, 'optionsList-control');
  };

  const replaceWithRangeSlider = async (controlId: string) => {
    await dashboardControls.controlEditorSetType(RANGE_SLIDER_CONTROL);
    await changeFieldType('weightLbs');
    await retry.try(async () => {
      await dashboardControls.rangeSliderWaitForLoading();
      await dashboardControls.verifyControlType(controlId, 'range-slider-control');
    });
  };

  const replaceWithTimeSlider = async (controlId: string) => {
    await dashboardControls.controlEditorSetType(TIME_SLIDER_CONTROL);
    await changeFieldType('@timestamp');
    await testSubjects.waitForDeleted('timeSlider-loading-spinner');
    await dashboardControls.verifyControlType(controlId, 'timeSlider');
  };

  describe('Replacing controls', async () => {
    let controlId: string;

    before(async () => {
      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
    });

    describe('Replace options list', async () => {
      beforeEach(async () => {
        await dashboardControls.clearAllControls();
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        controlId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(controlId);
      });

      it('with range slider', async () => {
        await replaceWithRangeSlider(controlId);
      });

      /** Because the time slider is temporarily disabled as of https://github.com/elastic/kibana/pull/130978,
       ** I simply skipped all time slider tests for now :) **/
      it.skip('with time slider', async () => {
        await replaceWithTimeSlider(controlId);
      });
    });

    describe('Replace range slider', async () => {
      beforeEach(async () => {
        await dashboardControls.clearAllControls();
        await dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'weightLbs',
        });
        await dashboardControls.rangeSliderWaitForLoading();
        controlId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(controlId);
      });

      it('with options list', async () => {
        await replaceWithOptionsList(controlId);
      });

      it.skip('with time slider', async () => {
        await replaceWithTimeSlider(controlId);
      });
    });

    describe.skip('Replace time slider', async () => {
      beforeEach(async () => {
        await dashboardControls.clearAllControls();
        await dashboardControls.createControl({
          controlType: TIME_SLIDER_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: '@timestamp',
        });
        await testSubjects.waitForDeleted('timeSlider-loading-spinner');
        controlId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(controlId);
      });

      it('with options list', async () => {
        await replaceWithOptionsList(controlId);
      });

      it('with range slider', async () => {
        await replaceWithRangeSlider(controlId);
      });
    });
  });
}
