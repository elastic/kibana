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
  const { dashboardControls, common, dashboard, timePicker } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
  ]);

  describe('Dashboard control group hierarchical chaining', () => {
    let controlIds: string[];

    const ensureAvailableOptionsEql = async (controlId: string, expectation: string[]) => {
      await dashboardControls.optionsListOpenPopover(controlId);
      await retry.try(async () => {
        expect(await dashboardControls.optionsListPopoverGetAvailableOptions()).to.eql(expectation);
      });
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
    };

    before(async () => {
      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();

      // populate an initial set of controls and get their ids.
      await dashboardControls.createOptionsListControl({
        dataViewTitle: 'animals-*',
        fieldName: 'animal.keyword',
        title: 'Animal',
      });

      await dashboardControls.createOptionsListControl({
        dataViewTitle: 'animals-*',
        fieldName: 'name.keyword',
        title: 'Animal Name',
      });

      await dashboardControls.createOptionsListControl({
        dataViewTitle: 'animals-*',
        fieldName: 'sound.keyword',
        title: 'Animal Sound',
      });

      controlIds = await dashboardControls.getAllControlIds();
    });

    it('Shows all available options in first Options List control', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await retry.try(async () => {
        expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(2);
      });
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);
    });

    it('Selecting an option in the first Options List will filter the second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverSelectOption('cat');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await ensureAvailableOptionsEql(controlIds[1], ['Tiger', 'sylvester']);
      await ensureAvailableOptionsEql(controlIds[2], ['hiss', 'meow', 'growl', 'grr']);
    });

    it('Selecting an option in the second Options List will filter the third control', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[1]);
      await dashboardControls.optionsListPopoverSelectOption('sylvester');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[1]);

      await ensureAvailableOptionsEql(controlIds[2], ['meow', 'hiss']);
    });

    it('Can select an option in the third Options List', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[2]);
      await dashboardControls.optionsListPopoverSelectOption('meow');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[2]);
    });

    it('Selecting a conflicting option in the first control will validate the second and third controls', async () => {
      await dashboardControls.optionsListOpenPopover(controlIds[0]);
      await dashboardControls.optionsListPopoverClearSelections();
      await dashboardControls.optionsListPopoverSelectOption('dog');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

      await ensureAvailableOptionsEql(controlIds[1], [
        'Fluffy',
        'Fee Fee',
        'Rover',
        'Ignored selection',
        'sylvester',
      ]);
      await ensureAvailableOptionsEql(controlIds[2], [
        'ruff',
        'bark',
        'grrr',
        'bow ow ow',
        'grr',
        'Ignored selection',
        'meow',
      ]);
    });

    describe('Hierarchical chaining off', async () => {
      before(async () => {
        await dashboardControls.updateChainingSystem('NONE');
      });

      it('Selecting an option in the first Options List will not filter the second or third controls', async () => {
        await dashboardControls.optionsListOpenPopover(controlIds[0]);
        await dashboardControls.optionsListPopoverSelectOption('cat');
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlIds[0]);

        await ensureAvailableOptionsEql(controlIds[1], [
          'Fluffy',
          'Tiger',
          'sylvester',
          'Fee Fee',
          'Rover',
        ]);
        await ensureAvailableOptionsEql(controlIds[2], [
          'hiss',
          'ruff',
          'bark',
          'grrr',
          'meow',
          'growl',
          'grr',
          'bow ow ow',
        ]);
      });
    });
  });
}
