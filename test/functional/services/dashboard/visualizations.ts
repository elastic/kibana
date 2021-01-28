/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function DashboardVisualizationProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'dashboard',
    'visualize',
    'visEditor',
    'header',
    'discover',
    'timePicker',
  ]);

  return new (class DashboardVisualizations {
    async createAndAddTSVBVisualization(name: string) {
      log.debug(`createAndAddTSVBVisualization(${name})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await dashboardAddPanel.ensureAddPanelIsShowing();
      await dashboardAddPanel.clickAddNewEmbeddableLink('visualization');
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualize.saveVisualizationExpectSuccess(name);
    }

    async createSavedSearch({
      name,
      query,
      fields,
    }: {
      name: string;
      query?: string;
      fields?: string[];
    }) {
      log.debug(`createSavedSearch(${name})`);
      await PageObjects.header.clickDiscover(true);
      await PageObjects.timePicker.setHistoricalDataRange();

      if (query) {
        await queryBar.setQuery(query);
        await queryBar.submitQuery();
      }

      if (fields) {
        for (let i = 0; i < fields.length; i++) {
          await PageObjects.discover.clickFieldListItemAdd(fields[i]);
        }
      }

      await PageObjects.discover.saveSearch(name);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.exists('saveSearchSuccess');
    }

    async createAndAddSavedSearch({
      name,
      query,
      fields,
    }: {
      name: string;
      query?: string;
      fields?: string[];
    }) {
      log.debug(`createAndAddSavedSearch(${name})`);
      await this.createSavedSearch({ name, query, fields });

      await PageObjects.header.clickDashboard();

      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await dashboardAddPanel.addSavedSearch(name);
    }

    async clickAddVisualizationButton() {
      log.debug('DashboardVisualizations.clickAddVisualizationButton');
      await testSubjects.click('addVisualizationButton');
    }

    async isNewVisDialogShowing() {
      log.debug('DashboardVisualizations.isNewVisDialogShowing');
      return await find.existsByCssSelector('.visNewVisDialog');
    }

    async ensureNewVisualizationDialogIsShowing() {
      let isShowing = await this.isNewVisDialogShowing();
      log.debug(`DashboardVisualizations.ensureNewVisualizationDialogIsShowing:${isShowing}`);
      if (!isShowing) {
        await retry.try(async () => {
          await this.clickAddVisualizationButton();
          isShowing = await this.isNewVisDialogShowing();
          log.debug(`DashboardVisualizations.ensureNewVisualizationDialogIsShowing:${isShowing}`);
          if (!isShowing) {
            throw new Error('New Vis Dialog still not open, trying again.');
          }
        });
      }
    }

    async createAndAddMarkdown({ name, markdown }: { name: string; markdown: string }) {
      log.debug(`createAndAddMarkdown(${markdown})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await this.ensureNewVisualizationDialogIsShowing();
      await PageObjects.visualize.clickMarkdownWidget();
      await PageObjects.visEditor.setMarkdownTxt(markdown);
      await PageObjects.visEditor.clickGo();
      await PageObjects.visualize.saveVisualizationExpectSuccess(name, {
        saveAsNew: false,
        redirectToOrigin: true,
      });
    }

    async createAndEmbedMetric(name: string) {
      log.debug(`createAndEmbedMetric(${name})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await this.ensureNewVisualizationDialogIsShowing();
      await PageObjects.visualize.clickAggBasedVisualizations();
      await PageObjects.visualize.clickMetric();
      await find.clickByCssSelector('li.euiListGroupItem:nth-of-type(2)');
      await testSubjects.exists('visualizesaveAndReturnButton');
      await testSubjects.click('visualizesaveAndReturnButton');
    }

    async createAndEmbedMarkdown({ name, markdown }: { name: string; markdown: string }) {
      log.debug(`createAndEmbedMarkdown(${markdown})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await this.ensureNewVisualizationDialogIsShowing();
      await PageObjects.visualize.clickMarkdownWidget();
      await PageObjects.visEditor.setMarkdownTxt(markdown);
      await PageObjects.visEditor.clickGo();
      await testSubjects.click('visualizesaveAndReturnButton');
    }
  })();
}
