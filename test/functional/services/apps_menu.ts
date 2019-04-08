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

export function AppsMenuProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const retry = getService('retry');
  const globalNav = getService('globalNav');

  return new class AppsMenu {
    /**
     * Get the text and href from each of the links in the apps menu
     */
    public async readLinks() {
      await this.ensureMenuOpen();
      const appMenu = await testSubjects.find('navDrawer&expanded appsMenu');
      const $ = await appMenu.parseDomContent();

      const links: Array<{
        text: string;
        href: string;
      }> = $.findTestSubjects('appLink')
        .toArray()
        .map((link: any) => {
          return {
            text: $(link).text(),
            href: $(link).attr('href'),
          };
        });

      await this.ensureMenuClosed();
      return links;
    }

    /**
     * Determine if an app link with the given name exists
     * @param name
     */
    public async linkExists(name: string) {
      return (await this.readLinks()).some(nl => nl.text === name);
    }

    /**
     * Click the app link within the app menu that has the given name
     * @param name
     */
    public async clickLink(name: string) {
      try {
        log.debug(`click "${name}" app link`);
        await this.ensureMenuOpen();
        const container = await testSubjects.find('navDrawer&expanded appsMenu');
        const link = await container.findByPartialLinkText(name);
        await link.click();
      } finally {
        await this.ensureMenuClosed();
      }
    }

    private async ensureMenuClosed() {
      await globalNav.moveMouseToLogo();
      await retry.waitFor(
        'apps drawer closed',
        async () => await testSubjects.exists('navDrawer&collapsed')
      );
    }

    private async ensureMenuOpen() {
      if (!(await testSubjects.exists('navDrawer&expanded'))) {
        await testSubjects.moveMouseTo('navDrawer');
        await retry.waitFor(
          'apps drawer open',
          async () => await testSubjects.exists('navDrawer&expanded')
        );
      }
    }
  }();
}
