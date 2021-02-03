/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function HeaderPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const PageObjects = getPageObjects(['common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {
    public async clickDiscover(ignoreAppLeaveWarning = false) {
      await appsMenu.clickLink('Discover', { category: 'kibana' });
      await this.onAppLeaveWarning(ignoreAppLeaveWarning);
      await PageObjects.common.waitForTopNavToBeVisible();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    public async clickVisualize(ignoreAppLeaveWarning = false) {
      await appsMenu.clickLink('Visualize', { category: 'kibana' });
      await this.onAppLeaveWarning(ignoreAppLeaveWarning);
      await this.awaitGlobalLoadingIndicatorHidden();
      await retry.waitFor('Visualize app to be loaded', async () => {
        const isNavVisible = await testSubjects.exists('top-nav');
        return isNavVisible;
      });
    }

    public async clickDashboard() {
      await appsMenu.clickLink('Dashboard', { category: 'kibana' });
      await retry.waitFor('dashboard app to be loaded', async () => {
        const isNavVisible = await testSubjects.exists('top-nav');
        const isLandingPageVisible = await testSubjects.exists('dashboardLandingPage');
        return isNavVisible || isLandingPageVisible;
      });
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    public async clickStackManagement() {
      await appsMenu.clickLink('Stack Management', { category: 'management' });
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    public async waitUntilLoadingHasFinished() {
      try {
        await this.isGlobalLoadingIndicatorVisible();
      } catch (exception) {
        if (exception.name === 'ElementNotVisible') {
          // selenium might just have been too slow to catch it
        } else {
          throw exception;
        }
      }
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    public async isGlobalLoadingIndicatorVisible() {
      log.debug('isGlobalLoadingIndicatorVisible');
      return await testSubjects.exists('globalLoadingIndicator', { timeout: 1500 });
    }

    public async awaitGlobalLoadingIndicatorHidden() {
      await testSubjects.existOrFail('globalLoadingIndicator-hidden', {
        allowHidden: true,
        timeout: defaultFindTimeout * 10,
      });
    }

    public async awaitKibanaChrome() {
      log.debug('awaitKibanaChrome');
      await testSubjects.find('kibanaChrome', defaultFindTimeout * 10);
    }

    public async onAppLeaveWarning(ignoreWarning = false) {
      await retry.try(async () => {
        const warning = await testSubjects.exists('confirmModalTitleText');
        if (warning) {
          await testSubjects.click(
            ignoreWarning ? 'confirmModalConfirmButton' : 'confirmModalCancelButton'
          );
        }
      });
    }
  }

  return new HeaderPage();
}
