/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../../ftr_provider_context';

export class DashboardReplacePanelService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly savedObjectsFinder = this.ctx.getService('savedObjectsFinder');

  async isReplacePanelOpen() {
    this.log.debug('DashboardReplacePanel.isReplacePanelOpen');
    return await this.testSubjects.exists('dashboardReplacePanel');
  }

  async ensureReplacePanelIsShowing() {
    this.log.debug('DashboardReplacePanel.ensureReplacePanelIsShowing');
    const isOpen = await this.isReplacePanelOpen();
    if (!isOpen) {
      throw new Error('Replace panel is not open, trying again.');
    }
  }

  async waitForListLoading() {
    await this.testSubjects.waitForDeleted('savedObjectFinderLoadingIndicator');
  }

  async closeReplacePanel() {
    await this.flyout.ensureClosed('dashboardReplacePanel');
  }

  async replaceSavedSearch(searchName: string) {
    return this.replaceEmbeddable(searchName, 'search');
  }

  async replaceSavedSearches(searches: string[]) {
    for (const name of searches) {
      await this.replaceSavedSearch(name);
    }
  }

  async replaceVisualization(vizName: string) {
    return this.replaceEmbeddable(vizName, 'visualization');
  }

  async replaceEmbeddable(embeddableName: string, embeddableType?: string) {
    this.log.debug(
      `DashboardReplacePanel.replaceEmbeddable, name: ${embeddableName}, type: ${embeddableType}`
    );
    await this.ensureReplacePanelIsShowing();
    await this.filterEmbeddableNames(`"${embeddableName.replace('-', ' ')}"`);
    if (embeddableType) {
      await this.savedObjectsFinder.toggleFilter(embeddableType);
    }
    await this.testSubjects.click(`savedObjectTitle${embeddableName.split(' ').join('-')}`);
    await this.testSubjects.exists('addObjectToDashboardSuccess');
    await this.closeReplacePanel();
    return embeddableName;
  }

  async filterEmbeddableNames(name: string) {
    // The search input field may be disabled while the table is loading so wait for it
    await this.waitForListLoading();
    await this.testSubjects.setValue('savedObjectFinderSearchInput', name);
    await this.waitForListLoading();
  }

  async panelReplaceLinkExists(name: string) {
    this.log.debug(`DashboardReplacePanel.panelReplaceLinkExists(${name})`);
    await this.ensureReplacePanelIsShowing();
    await this.filterEmbeddableNames(`"${name}"`);
    return await this.testSubjects.exists(`savedObjectTitle${name.split(' ').join('-')}`);
  }
}
