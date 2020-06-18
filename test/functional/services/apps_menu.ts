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

import { FtrProviderContext } from '../ftr_provider_context';

export function AppsMenuProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const config = getService('config');
  const defaultFindTimeout = config.get('timeouts.find');
  const find = getService('find');

  return new (class AppsMenu {
    private async waitUntilLoadingHasFinished() {
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

    private async isGlobalLoadingIndicatorVisible() {
      log.debug('isGlobalLoadingIndicatorVisible');
      return await testSubjects.exists('globalLoadingIndicator', { timeout: 1500 });
    }

    private async awaitGlobalLoadingIndicatorHidden() {
      await testSubjects.existOrFail('globalLoadingIndicator-hidden', {
        allowHidden: true,
        timeout: defaultFindTimeout * 10,
      });
    }
    /**
     * Close the collapsible nav
     * TODO #64541 can replace with a data-test-subj
     */
    public async closeCollapsibleNav() {
      const CLOSE_BUTTON = '[data-test-subj=collapsibleNav] > button';
      if (await find.existsByCssSelector(CLOSE_BUTTON)) {
        // Close button is only visible when focused
        const button = await find.byCssSelector(CLOSE_BUTTON);
        await button.focus();

        await find.clickByCssSelector(CLOSE_BUTTON);
      }
    }

    public async openCollapsibleNav() {
      if (!(await testSubjects.exists('collapsibleNav'))) {
        await testSubjects.click('toggleNavButton');
      }
    }

    /**
     * Get the attributes from each of the links in the apps menu
     */
    public async readLinks() {
      // wait for the chrome to finish initializing
      await this.waitUntilLoadingHasFinished();
      await this.openCollapsibleNav();
      const appMenu = await testSubjects.find('collapsibleNav');
      const $ = await appMenu.parseDomContent();
      const links = $.findTestSubjects('collapsibleNavAppLink')
        .toArray()
        .map((link) => {
          return {
            text: $(link).text(),
            href: $(link).attr('href'),
            disabled: $(link).attr('disabled') != null,
          };
        });

      await this.closeCollapsibleNav();

      return links;
    }

    /**
     * Get the attributes from the link with the given name.
     * @param name
     */
    public async getLink(name: string) {
      return (await this.readLinks()).find((nl) => nl.text === name);
    }

    /**
     * Determine if an app link with the given name exists
     * @param name
     */
    public async linkExists(name: string) {
      return (await this.readLinks()).some((nl) => nl.text === name);
    }

    /**
     * Click the app link within the app menu that has the given name
     * @param name
     * @param options.closeCollapsibleNav
     * @param options.category - optional field to ensure that a link is clicked in a particular category
     *                           helpful when there may be a recent link with the same name as an app
     */
    public async clickLink(
      name: string,
      {
        closeCollapsibleNav = true,
        category,
      }: { closeCollapsibleNav?: boolean; category?: string } = {}
    ) {
      try {
        log.debug(`click "${name}" app link`);
        await this.openCollapsibleNav();
        let nav;
        if (typeof category === 'string') {
          nav = await testSubjects.find(`collapsibleNavGroup-${category}`);
        } else {
          nav = await testSubjects.find('collapsibleNav');
        }
        const link = await nav.findByPartialLinkText(name);
        await link.click();

        if (closeCollapsibleNav) {
          await this.closeCollapsibleNav();
        }
      } finally {
        // Intentionally empty
      }
    }
  })();
}
