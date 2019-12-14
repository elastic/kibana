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

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');

  describe('ui plugins', function() {
    describe('loading', function describeIndexTests() {
      before(async () => {
        await PageObjects.common.navigateToApp('settings');
      });

      it('should attach string to window.corePluginB', async () => {
        const corePluginB = await browser.execute('return window.corePluginB');
        expect(corePluginB).to.equal(`Plugin A said: Hello from Plugin A!`);
      });
    });
    describe('have injectedMetadata service provided', function describeIndexTests() {
      before(async () => {
        await PageObjects.common.navigateToApp('bar');
      });

      it('should attach string to window.corePluginB', async () => {
        const hasAccessToInjectedMetadata = await browser.execute(
          'return window.hasAccessToInjectedMetadata'
        );
        expect(hasAccessToInjectedMetadata).to.equal(true);
      });
    });
    describe('have env data provided', function describeIndexTests() {
      before(async () => {
        await PageObjects.common.navigateToApp('bar');
      });

      it('should attach pluginContext to window.corePluginB', async () => {
        const envData = await browser.execute('return window.env');
        expect(envData.mode.dev).to.be(true);
        expect(envData.packageInfo.version).to.be.a('string');
      });
    });
  });
}
