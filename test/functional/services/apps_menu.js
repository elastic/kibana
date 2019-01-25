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

export function AppsMenuProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const retry = getService('retry');
  const flyout = getService('flyout');

  return new class AppsMenu {
    async readLinks() {
      await this._ensureMenuOpen();
      const buttons = await testSubjects.findAll('appsMenu appLink');
      try {
        return Promise.all(buttons.map(async (element) => ({
          text: await element.getVisibleText(),
          href: await element.getProperty('href'),
        })));
      } finally {
        await this._ensureMenuClosed();
      }
    }

    async linkExists(name) {
      return (await this.readLinks()).some(nl => nl.text === name);
    }

    async clickLink(appTitle) {
      log.debug(`click "${appTitle}" tab`);
      await this._ensureMenuOpen();
      const container = await testSubjects.find('appsMenu');
      const link = await container.findByPartialLinkText(appTitle);
      await link.click();
    }

    async _ensureMenuOpen() {
      // some apps render flyouts that cover the global nav menu, so we make sure all flyouts are
      // closed before trying to use the appsMenu
      await flyout.ensureAllClosed();

      if (!await testSubjects.exists('appsMenu')) {
        await testSubjects.click('appsMenuButton');
        await retry.waitFor('apps menu displayed', async () => (
          await testSubjects.exists('appsMenu')
        ));
      }
    }

    async _ensureMenuClosed() {
      const [appsMenuButtonExists, appsMenuExists] = await Promise.all([
        testSubjects.exists('appsMenuButton'),
        testSubjects.exists('appsMenu')
      ]);

      if (appsMenuButtonExists && appsMenuExists) {
        await testSubjects.click('appsMenuButton');
        await retry.waitFor('user menu closed', async () => (
          !await testSubjects.exists('appsMenu')
        ));
      }
    }
  };
}
