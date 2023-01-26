/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS } from '../../../../page_objects/dashboard_page_controls';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');

  const { dashboardControls, console, common, dashboard, header } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'settings',
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
    let dashboardId: string;
    let controlId: string;

    before(async () => {
      dashboardId = await dashboard.getDashboardIdFromCurrentUrl();
      await setAllowExpensiveQueries(false);

      // can't use the dashboard landing page when allow expensive queries is `false` so need to navigate via url instead
      await dashboard.gotoDashboardURL({ id: dashboardId, editMode: true });
      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'sound.keyword',
      });
      controlId = (await dashboardControls.getAllControlIds())[0];
      await dashboard.clickQuickSave();
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await dashboardControls.deleteAllControls();
      await dashboard.clickQuickSave();

      await setAllowExpensiveQueries(true);
    });

    it('Shows available options in options list', async () => {
      await dashboardControls.ensureAvailableOptionsEqual(controlId, {
        suggestions: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS,
        invalidSelections: [],
      });
    });

    it('Can search options list for available options', async () => {
      await dashboardControls.optionsListOpenPopover(controlId);
      await dashboardControls.optionsListPopoverSearchForOption('meo');
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

    it('Can search options list for available options - case sensitive', async () => {
      await dashboardControls.optionsListOpenPopover(controlId);
      await dashboardControls.optionsListPopoverSearchForOption('MEO');
      const cardinality = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
      expect(cardinality).to.be(0);
      await dashboardControls.optionsListPopoverClearSearch();
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
    });
  });
}
