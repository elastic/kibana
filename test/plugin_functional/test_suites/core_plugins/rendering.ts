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

  async function loadingScreenNotShown() {
    expect(await testSubjects.exists('kbnLoadingMessage')).to.be(false);
  }

  describe('rendering service', () => {
    it('renders "core" application', async () => {
      await navigate('/render/core');

      await loadingScreenNotShown();
      expect(await getLegacyMode()).to.be(false);
      expect(await getUserSettings()).to.not.be.empty();
    });

    it('renders "core" application without user settings', async () => {
      await navigate('/render/core?includeUserSettings=false');

      await loadingScreenNotShown();
      expect(await getUserSettings()).to.be.empty();
    });

    it('renders "legacy" application', async () => {
      await navigate('/render/core_plugin_legacy');

      await loadingScreenNotShown();
      expect(await getLegacyMode()).to.be(true);
      expect(await getUserSettings()).to.not.be.empty();
    });

    it('renders "legacy" application without user settings', async () => {
      await navigate('/render/core_plugin_legacy?includeUserSettings=false');

      await loadingScreenNotShown();
      expect(await getLegacyMode()).to.be(true);
      expect(await getUserSettings()).to.be.empty();
    });
  });
}
