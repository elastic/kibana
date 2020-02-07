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

  return new (class AppsMenu {
    /**
     * Get the attributes from each of the links in the apps menu
     */
    public async readLinks() {
      const appMenu = await testSubjects.find('navDrawer');
      const $ = await appMenu.parseDomContent();

      const links = $.findTestSubjects('navDrawerAppsMenuLink')
        .toArray()
        .map(link => {
          return {
            text: $(link).text(),
            href: $(link).attr('href'),
            disabled: $(link).attr('disabled') != null,
          };
        });

      return links;
    }

    /**
     * Get the attributes from the link with the given name.
     * @param name
     */
    public async getLink(name: string) {
      return (await this.readLinks()).find(nl => nl.text === name);
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
        const container = await testSubjects.find('navDrawer');
        // Text content is not visible or selectable (0px width) so we use an attr with th same value
        const link = await container.findByCssSelector(`[aria-label='${name}']`);
        await link.click();
      } finally {
        // Intentionally empty
      }
    }
  })();
}
