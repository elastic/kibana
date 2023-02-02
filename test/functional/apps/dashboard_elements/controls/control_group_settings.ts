/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const { dashboardControls, common, dashboard } = getPageObjects([
    'dashboardControls',
    'dashboard',
    'common',
  ]);

  describe('Dashboard control group settings', () => {
    before(async () => {
      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await dashboard.saveDashboard('Test Control Group Settings');
    });

    it('adjust layout of controls', async () => {
      await dashboard.switchToEditMode();
      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'sound.keyword',
      });
      await dashboardControls.adjustControlsLayout('twoLine');
      const controlGroupWrapper = await testSubjects.find('controls-group-wrapper');
      expect(await controlGroupWrapper.elementHasClass('controlsWrapper--twoLine')).to.be(true);
    });

    describe('apply new default width and grow', async () => {
      it('defaults to medium width and grow enabled', async () => {
        await dashboardControls.openCreateControlFlyout();
        const mediumWidthButton = await testSubjects.find('control-editor-width-medium');
        expect(await mediumWidthButton.elementHasClass('euiButtonGroupButton-isSelected')).to.be(
          true
        );
        const growSwitch = await testSubjects.find('control-editor-grow-switch');
        expect(await growSwitch.getAttribute('aria-checked')).to.be('true');
        await testSubjects.click('control-editor-cancel');
        await testSubjects.click('confirmModalConfirmButton');
      });

      it('sets default to width and grow of last created control', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'name.keyword',
          width: 'small',
          grow: false,
        });

        const controlIds = await dashboardControls.getAllControlIds();
        const firstControl = await find.byXPath(`//div[@data-control-id="${controlIds[0]}"]`);
        expect(await firstControl.elementHasClass('controlFrameWrapper--medium')).to.be(true);
        expect(await firstControl.getAttribute('class')).not.to.contain('euiFlexItem-growZero');
        const secondControl = await find.byXPath(`//div[@data-control-id="${controlIds[1]}"]`);
        expect(await secondControl.elementHasClass('controlFrameWrapper--small')).to.be(true);
        expect(await secondControl.getAttribute('class')).to.contain('euiFlexItem-growZero');

        await dashboardControls.openCreateControlFlyout();
        const smallWidthButton = await testSubjects.find('control-editor-width-small');
        expect(await smallWidthButton.elementHasClass('euiButtonGroupButton-isSelected')).to.be(
          true
        );
        const growSwitch = await testSubjects.find('control-editor-grow-switch');
        expect(await growSwitch.getAttribute('aria-checked')).to.be('false');
        await testSubjects.click('control-editor-cancel');
        await testSubjects.click('confirmModalConfirmButton');
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
