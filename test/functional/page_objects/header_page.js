/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export function HeaderPageProvider({ getService, getPageObjects }) {
  const config = getService('config');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class HeaderPage {
    async clickDiscover() {
      await appsMenu.clickLink('Discover');
      await PageObjects.common.waitForTopNavToBeVisible();
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickVisualize() {
      await appsMenu.clickLink('Visualize');
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

    async clickDashboard() {
      await appsMenu.clickLink('Dashboard');
      await retry.waitFor('dashboard app to be loaded', async () => {
        const isNavVisible = await testSubjects.exists('top-nav');
        const isLandingPageVisible = await testSubjects.exists('dashboardLandingPage');
        return isNavVisible || isLandingPageVisible;
      });
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async clickManagement() {
      await appsMenu.clickLink('Management');
      await this.awaitGlobalLoadingIndicatorHidden();
    }

    async waitUntilLoadingHasFinished() {
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

    async isGlobalLoadingIndicatorVisible() {
      log.debug('isGlobalLoadingIndicatorVisible');
      return await testSubjects.exists('globalLoadingIndicator', { timeout: 1500 });
    }

    async awaitGlobalLoadingIndicatorHidden() {
      await testSubjects.existOrFail('globalLoadingIndicator-hidden', {
        allowHidden: true,
        timeout: defaultFindTimeout * 10,
      });
    }

    async awaitKibanaChrome() {
      log.debug('awaitKibanaChrome');
      await testSubjects.find('kibanaChrome', defaultFindTimeout * 10);
    }
  }

  return new HeaderPage();
}
