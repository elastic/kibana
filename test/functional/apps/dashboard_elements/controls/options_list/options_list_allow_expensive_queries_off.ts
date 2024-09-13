/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS } from '../../../../page_objects/dashboard_page_controls';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');

  const { dashboardControls, timePicker, console, common, dashboard, header } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'console',
    'common',
    'header',
  ]);

  const setAllowExpensiveQueries = async (value: boolean) => {
    await common.navigateToApp('console');
    await console.closeHelpIfExists();
    await console.clearTextArea();
    await console.enterRequest(
      '\nPUT _cluster/settings\n{"transient": {"search.allow_expensive_queries": ' + value + '}}'
    );
    await console.clickPlay();
    await header.waitUntilLoadingHasFinished();
    await browser.refresh();
  };

  describe('Allow expensive queries setting is off', () => {
    let controlId: string;

    before(async () => {
      await setAllowExpensiveQueries(false);

      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboard.ensureDashboardIsInEditMode();
      await timePicker.setDefaultDataRange();
      await header.waitUntilLoadingHasFinished();

      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'sound.keyword',
      });
      controlId = (await dashboardControls.getAllControlIds())[0];
    });

    after(async () => {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickUnsavedChangesDiscard(`discard-unsaved-New-Dashboard`);
      await setAllowExpensiveQueries(true);
    });

    it('Shows available options in options list', async () => {
      await dashboardControls.ensureAvailableOptionsEqual(controlId, {
        suggestions: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS,
        invalidSelections: [],
      });
    });

    it('Can search options list for available options - exact match, case insensitive', async () => {
      await dashboardControls.optionsListOpenPopover(controlId);
      await dashboardControls.optionsListPopoverSearchForOption('mEOw');
      await dashboardControls.ensureAvailableOptionsEqual(
        controlId,
        {
          suggestions: { meow: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.meow },
          invalidSelections: [],
        },
        true
      );
      await dashboardControls.optionsListPopoverClearSearch();
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
    });

    it('Can search options list for available options - does not find partial match', async () => {
      await dashboardControls.optionsListOpenPopover(controlId);
      await dashboardControls.optionsListPopoverSearchForOption('meo');
      const cardinality = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
      expect(cardinality).to.be(0);
      await dashboardControls.optionsListPopoverClearSearch();
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
    });
  });
}
