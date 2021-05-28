/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../../ftr_provider_context';

export class DashboardVisualizationsService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly queryBar = this.ctx.getService('queryBar');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly dashboardAddPanel = this.ctx.getService('dashboardAddPanel');
  private readonly PageObjects = this.ctx.getPageObjects([
    'dashboard',
    'visualize',
    'visEditor',
    'header',
    'discover',
    'timePicker',
  ]);

  async createAndAddTSVBVisualization(name: string) {
    this.log.debug(`createAndAddTSVBVisualization(${name})`);
    const inViewMode = await this.PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.PageObjects.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.clickEditorMenuButton();
    await this.dashboardAddPanel.clickAddNewEmbeddableLink('metrics');
    await this.PageObjects.visualize.clickVisualBuilder();
    await this.PageObjects.visualize.saveVisualizationExpectSuccess(name);
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
    this.log.debug(`createSavedSearch(${name})`);
    await this.PageObjects.header.clickDiscover(true);
    await this.PageObjects.timePicker.setHistoricalDataRange();

    if (query) {
      await this.queryBar.setQuery(query);
      await this.queryBar.submitQuery();
    }

    if (fields) {
      for (let i = 0; i < fields.length; i++) {
        await this.PageObjects.discover.clickFieldListItemAdd(fields[i]);
      }
    }

    await this.PageObjects.discover.saveSearch(name);
    await this.PageObjects.header.waitUntilLoadingHasFinished();
    await this.testSubjects.exists('saveSearchSuccess');
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
    this.log.debug(`createAndAddSavedSearch(${name})`);
    await this.createSavedSearch({ name, query, fields });

    await this.PageObjects.header.clickDashboard();

    const inViewMode = await this.PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.PageObjects.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.addSavedSearch(name);
  }

  async createAndAddMarkdown({ name, markdown }: { name: string; markdown: string }) {
    this.log.debug(`createAndAddMarkdown(${markdown})`);
    const inViewMode = await this.PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.PageObjects.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.clickMarkdownQuickButton();
    await this.PageObjects.visEditor.setMarkdownTxt(markdown);
    await this.PageObjects.visEditor.clickGo();
    await this.PageObjects.visualize.saveVisualizationExpectSuccess(name, {
      saveAsNew: false,
      redirectToOrigin: true,
    });
  }

  async createAndEmbedMetric(name: string) {
    this.log.debug(`createAndEmbedMetric(${name})`);
    const inViewMode = await this.PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.PageObjects.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.clickEditorMenuButton();
    await this.dashboardAddPanel.clickAggBasedVisualizations();
    await this.dashboardAddPanel.clickVisType('metric');
    await this.testSubjects.click('savedObjectTitlelogstash-*');
    await this.testSubjects.exists('visualizesaveAndReturnButton');
    await this.testSubjects.click('visualizesaveAndReturnButton');
  }

  async createAndEmbedMarkdown({ name, markdown }: { name: string; markdown: string }) {
    this.log.debug(`createAndEmbedMarkdown(${markdown})`);
    const inViewMode = await this.PageObjects.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.PageObjects.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.clickMarkdownQuickButton();
    await this.PageObjects.visEditor.setMarkdownTxt(markdown);
    await this.PageObjects.visEditor.clickGo();
    await this.testSubjects.click('visualizesaveAndReturnButton');
  }
}
