/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function DashboardReplacePanelProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');

  return new (class DashboardReplacePanel {
    async toggleFilterPopover() {
      log.debug('DashboardReplacePanel.toggleFilter');
      await testSubjects.click('savedObjectFinderFilterButton');
    }

    async toggleFilter(type: string) {
      log.debug(`DashboardReplacePanel.replaceToFilter(${type})`);
      await this.waitForListLoading();
      await this.toggleFilterPopover();
      await testSubjects.click(`savedObjectFinderFilter-${type}`);
      await this.toggleFilterPopover();
    }

    async isReplacePanelOpen() {
      log.debug('DashboardReplacePanel.isReplacePanelOpen');
      return await testSubjects.exists('dashboardReplacePanel');
    }

    async ensureReplacePanelIsShowing() {
      log.debug('DashboardReplacePanel.ensureReplacePanelIsShowing');
      const isOpen = await this.isReplacePanelOpen();
      if (!isOpen) {
        throw new Error('Replace panel is not open, trying again.');
      }
    }

    async waitForListLoading() {
      await testSubjects.waitForDeleted('savedObjectFinderLoadingIndicator');
    }

    async closeReplacePanel() {
      await flyout.ensureClosed('dashboardReplacePanel');
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
      log.debug(
        `DashboardReplacePanel.replaceEmbeddable, name: ${embeddableName}, type: ${embeddableType}`
      );
      await this.ensureReplacePanelIsShowing();
      if (embeddableType) {
        await this.toggleFilter(embeddableType);
      }
      await this.filterEmbeddableNames(`"${embeddableName.replace('-', ' ')}"`);
      await testSubjects.click(`savedObjectTitle${embeddableName.split(' ').join('-')}`);
      await testSubjects.exists('addObjectToDashboardSuccess');
      await this.closeReplacePanel();
      return embeddableName;
    }

    async filterEmbeddableNames(name: string) {
      // The search input field may be disabled while the table is loading so wait for it
      await this.waitForListLoading();
      await testSubjects.setValue('savedObjectFinderSearchInput', name);
      await this.waitForListLoading();
    }

    async panelReplaceLinkExists(name: string) {
      log.debug(`DashboardReplacePanel.panelReplaceLinkExists(${name})`);
      await this.ensureReplacePanelIsShowing();
      await this.filterEmbeddableNames(`"${name}"`);
      return await testSubjects.exists(`savedObjectTitle${name.split(' ').join('-')}`);
    }
  })();
}
