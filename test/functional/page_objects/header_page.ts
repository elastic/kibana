/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function HeaderPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {
    public async clickDiscover() {
      await appsMenu.clickLink('Discover', { category: 'kibana' });
      await PageObjects.common.waitForTopNavToBeVisible();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    public async clickVisualize() {
      await appsMenu.clickLink('Visualize', { category: 'kibana' });
      await this.awaitGlobalLoadingIndicatorHidden();
      await retry.waitFor('first breadcrumb to be "Visualize"', async () => {
        const firstBreadcrumb = await globalNav.getFirstBreadcrumb();
        if (firstBreadcrumb !== 'Visualize') {
          log.debug('-- first breadcrumb =', firstBreadcrumb);
          return false;
        }

        return true;
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
  }

  return new HeaderPage();
}
