/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import expect from '@kbn/expect';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';

import { FtrProviderContext } from '../../../../ftr_provider_context';
import { OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS } from '../../../../page_objects/dashboard_page_controls';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const filterBar = getService('filterBar');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const { dashboardControls, dashboard, header } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'settings',
    'console',
    'common',
    'header',
  ]);

  describe('Dashboard options list validation', () => {
    let controlId: string;

    before(async () => {
      await dashboard.ensureDashboardIsInEditMode();
      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'sound.keyword',
        title: 'Animal Sounds',
      });
      controlId = (await dashboardControls.getAllControlIds())[0];
      await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
      await dashboard.clickQuickSave();
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await filterBar.removeAllFilters();
      await dashboardControls.deleteAllControls();
      await dashboardPanelActions.removePanelByTitle('Rendering Test: animal sounds pie');
      await dashboard.clickQuickSave();
    });

    describe('Options List dashboard validation', () => {
      before(async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSelectOption('meow');
        await dashboardControls.optionsListPopoverSelectOption('bark');
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      });

      after(async () => {
        await dashboardControls.clearControlSelections(controlId);
        await filterBar.removeAllFilters();
        await queryBar.clickQuerySubmitButton();
      });

      it('Can mark selections invalid with Query', async () => {
        await queryBar.setQuery('NOT animal.keyword : "dog" ');
        await queryBar.submitQuery();
        await dashboard.waitForRenderComplete();
        await header.waitUntilLoadingHasFinished();

        const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
          'hiss',
          'meow',
          'growl',
          'grr',
        ]);
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: { ...suggestions, grr: suggestions.grr - 1 },
          invalidSelections: ['bark'],
        });
        // only valid selections are applied as filters.
        expect(await pieChart.getPieSliceCount()).to.be(1);
      });

      it('can make invalid selections valid again if the parent filter changes', async () => {
        await queryBar.setQuery('');
        await queryBar.submitQuery();
        await dashboard.waitForRenderComplete();
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS,
          invalidSelections: [],
        });
        expect(await pieChart.getPieSliceCount()).to.be(2);
      });

      it('Can mark multiple selections invalid with Filter', async () => {
        await filterBar.addFilter({ field: 'sound.keyword', operation: 'is', value: 'hiss' });
        await dashboard.waitForRenderComplete();
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: {
            hiss: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.hiss,
          },
          invalidSelections: ['meow', 'bark'],
        });
        // there are no valid selections, so no pie chart is rendered.
        expect(await pieChart.expectEmptyPieChart());
      });
    });

    describe('Options List dashboard no validation', () => {
      before(async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSelectOption('meow');
        await dashboardControls.optionsListPopoverSelectOption('bark');
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        await dashboardControls.updateValidationSetting(false);
      });

      it('Does not mark selections invalid with Query', async () => {
        await queryBar.setQuery('NOT animal.keyword : "dog" ');
        await queryBar.submitQuery();
        await dashboard.waitForRenderComplete();
        await header.waitUntilLoadingHasFinished();

        const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
          'hiss',
          'meow',
          'growl',
          'grr',
        ]);
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: { ...suggestions, grr: suggestions.grr - 1 },
          invalidSelections: [],
        });
      });

      it('Does not mark multiple selections invalid with Filter', async () => {
        await filterBar.addFilter({ field: 'sound.keyword', operation: 'is', value: 'hiss' });
        await dashboard.waitForRenderComplete();
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: {
            hiss: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.hiss,
          },
          invalidSelections: [],
        });
        // there are no valid selections, so no pie chart is rendered.
        expect(await pieChart.expectEmptyPieChart());
      });
    });
  });
}
