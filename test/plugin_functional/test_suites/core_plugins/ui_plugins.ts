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
import '../../plugins/core_provider_plugin/types';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');

  describe('ui plugins', function() {
    describe('loading', function describeIndexTests() {
      before(async () => {
        await PageObjects.common.navigateToApp('settings');
      });

      it('should run the new platform plugins', async () => {
        expect(
          await browser.execute(() => {
            return window.np.setup.plugins.core_plugin_b.sayHi();
          })
        ).to.be('Plugin A said: Hello from Plugin A!');
      });

      it('should attach string to window.corePluginB', async () => {
        expect(
          await browser.execute(() => {
            return window.np.setup.core.injectedMetadata.getKibanaBuildNumber();
          })
        ).to.be.a('number');
      });

      it('should have access to start services via coreSetup.getStartServices', async () => {
        expect(
          await browser.executeAsync(async cb => {
            window.np.setup.core.injectedMetadata.getKibanaBuildNumber();
            const [coreStart] = await window.np.setup.core.getStartServices();
            cb(Boolean(coreStart.overlays));
          })
        ).to.be(true);
      });
    });

    describe('have env data provided', function describeIndexTests() {
      before(async () => {
        await PageObjects.common.navigateToApp('bar');
      });

      it('should attach pluginContext to window.env', async () => {
        const envData: any = await browser.execute('return window.env');
        expect(envData.mode.dev).to.be(true);
        expect(envData.packageInfo.version).to.be.a('string');
      });
    });
  });
}
