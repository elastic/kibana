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
import { PluginFunctionalProviderContext } from '../../services';
import { CoreProvider } from '../../plugins/core_provider_plugin/types';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const supertest = getService('supertest');

  describe('ui settings', function() {
    before(async () => {
      await PageObjects.common.navigateToApp('settings');
    });

    it('client plugins have access to registered settings', async () => {
      const settings = await browser.execute(() => {
        const { setup } = ((window as unknown) as CoreProvider).__coreProvider;
        return setup.core.uiSettings.getAll().ui_settings_plugin;
      });

      expect(settings).to.eql({
        category: ['any'],
        description: 'just for testing',
        name: 'from_ui_settings_plugin',
        value: '2',
      });

      const settingsValue = await browser.execute(() => {
        const { setup } = ((window as unknown) as CoreProvider).__coreProvider;
        return setup.core.uiSettings.get('ui_settings_plugin');
      });

      expect(settingsValue).to.be('2');

      const settingsValueViaObservables = await browser.executeAsync(async (callback: Function) => {
        const { setup } = ((window as unknown) as CoreProvider).__coreProvider;
        setup.core.uiSettings.get$('ui_settings_plugin').subscribe(v => callback(v));
      });

      expect(settingsValueViaObservables).to.be('2');
    });

    it('server plugins have access to registered settings', async () => {
      await supertest
        .get('/api/ui-settings-plugin')
        .expect(200)
        .expect({ uiSettingsValue: 2 });
    });
  });
}
