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
  private readonly dashboard = this.ctx.getPageObject('dashboard');
  private readonly visualize = this.ctx.getPageObject('visualize');
  private readonly visEditor = this.ctx.getPageObject('visEditor');
  private readonly header = this.ctx.getPageObject('header');
  private readonly unifiedSearch = this.ctx.getPageObject('unifiedSearch');
  private readonly discover = this.ctx.getPageObject('discover');
  private readonly timePicker = this.ctx.getPageObject('timePicker');

  async createAndAddTSVBVisualization(name: string) {
    this.log.debug(`createAndAddTSVBVisualization(${name})`);
    const inViewMode = await this.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.clickEditorMenuButton();
    await this.dashboardAddPanel.clickAddNewEmbeddableLink('metrics');
    await this.visualize.clickVisualBuilder();
    await this.visualize.saveVisualizationExpectSuccess(name);
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
    await this.header.clickDiscover(true);
    await this.unifiedSearch.closeTourPopoverByLocalStorage();
    await this.timePicker.setHistoricalDataRange();

    if (query) {
      await this.queryBar.setQuery(query);
      await this.queryBar.submitQuery();
    }

    if (fields) {
      for (let i = 0; i < fields.length; i++) {
        await this.discover.clickFieldListItemAdd(fields[i]);
      }
    }

    await this.discover.saveSearch(name);
    await this.header.waitUntilLoadingHasFinished();
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

    await this.header.clickDashboard();

    const inViewMode = await this.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.addSavedSearch(name);
  }

  async createAndAddMarkdown({ name, markdown }: { name: string; markdown: string }) {
    this.log.debug(`createAndAddMarkdown(${markdown})`);
    const inViewMode = await this.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.clickMarkdownQuickButton();
    await this.visEditor.setMarkdownTxt(markdown);
    await this.visEditor.clickGo();
    await this.visualize.saveVisualizationExpectSuccess(name, {
      saveAsNew: false,
      redirectToOrigin: true,
    });
  }

  async createAndEmbedMetric(name: string) {
    this.log.debug(`createAndEmbedMetric(${name})`);
    const inViewMode = await this.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.dashboard.switchToEditMode();
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
    const inViewMode = await this.dashboard.getIsInViewMode();
    if (inViewMode) {
      await this.dashboard.switchToEditMode();
    }
    await this.dashboardAddPanel.clickMarkdownQuickButton();
    await this.visEditor.setMarkdownTxt(markdown);
    await this.visEditor.clickGo();
    await this.testSubjects.click('visualizesaveAndReturnButton');
  }
}
