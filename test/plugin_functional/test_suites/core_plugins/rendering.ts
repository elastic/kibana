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

import expect from '@kbn/expect';

import '../../plugins/core_provider_plugin/types';
import { PluginFunctionalProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  function navigate(path: string) {
    return browser.get(`${PageObjects.common.getHostPort()}${path}`);
  }

  function getLegacyMode() {
    return browser.execute(() => {
      return JSON.parse(document.querySelector('kbn-injected-metadata')!.getAttribute('data')!)
        .legacyMode;
    });
  }

  function getUserSettings() {
    return browser.execute(() => {
      return JSON.parse(document.querySelector('kbn-injected-metadata')!.getAttribute('data')!)
        .legacyMetadata.uiSettings.user;
    });
  }

  async function init() {
    const loading = await testSubjects.find('kbnLoadingMessage', 5000);

    return () => find.waitForElementStale(loading);
  }

  describe('rendering service', () => {
    it('renders "core" application', async () => {
      await navigate('/render/core');

      const [loaded, legacyMode, userSettings] = await Promise.all([
        init(),
        getLegacyMode(),
        getUserSettings(),
      ]);

      expect(legacyMode).to.be(false);
      expect(userSettings).to.not.be.empty();

      await loaded();

      expect(await testSubjects.exists('renderingHeader')).to.be(true);
    });

    it('renders "core" application without user settings', async () => {
      await navigate('/render/core?includeUserSettings=false');

      const [loaded, legacyMode, userSettings] = await Promise.all([
        init(),
        getLegacyMode(),
        getUserSettings(),
      ]);

      expect(legacyMode).to.be(false);
      expect(userSettings).to.be.empty();

      await loaded();

      expect(await testSubjects.exists('renderingHeader')).to.be(true);
    });

    it('renders "legacy" application', async () => {
      await navigate('/render/core_plugin_legacy');

      const [loaded, legacyMode, userSettings] = await Promise.all([
        init(),
        getLegacyMode(),
        getUserSettings(),
      ]);

      expect(legacyMode).to.be(true);
      expect(userSettings).to.not.be.empty();

      await loaded();

      expect(await testSubjects.exists('coreLegacyCompatH1')).to.be(true);
      expect(await testSubjects.exists('renderingHeader')).to.be(false);
    });

    it('renders "legacy" application without user settings', async () => {
      await navigate('/render/core_plugin_legacy?includeUserSettings=false');

      const [loaded, legacyMode, userSettings] = await Promise.all([
        init(),
        getLegacyMode(),
        getUserSettings(),
      ]);

      expect(legacyMode).to.be(true);
      expect(userSettings).to.be.empty();

      await loaded();

      expect(await testSubjects.exists('coreLegacyCompatH1')).to.be(true);
      expect(await testSubjects.exists('renderingHeader')).to.be(false);
    });
  });
}
