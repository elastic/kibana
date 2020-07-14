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
import '../../../../test/plugin_functional/plugins/core_provider_plugin/types';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const supertest = getService('supertest');

  describe('ui plugins', function () {
    describe('loading', function describeIndexTests() {
      before(async () => {
        await PageObjects.common.navigateToApp('settings');
      });

      it('should run the new platform plugins', async () => {
        expect(
          await browser.execute(() => {
            return window.__coreProvider.setup.plugins.core_plugin_b.sayHi();
          })
        ).to.be('Plugin A said: Hello from Plugin A!');
      });
    });

    describe('should have access to the core services', function describeIndexTests() {
      before(async () => {
        await PageObjects.common.navigateToApp('settings');
      });

      it('to start services via coreSetup.getStartServices', async () => {
        expect(
          await browser.executeAsync<boolean>(async (cb) => {
            const [coreStart] = await window.__coreProvider.setup.core.getStartServices();
            cb(Boolean(coreStart.overlays));
          })
        ).to.be(true);
      });
    });

    describe('have env data provided', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('bar');
      });

      it('should attach pluginContext to window.env', async () => {
        const envData: any = await browser.execute('return window.env');
        expect(envData.mode.dev).to.be(true);
        expect(envData.packageInfo.version).to.be.a('string');
      });
    });

    describe('http fetching', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('settings');
      });

      it('should send kbn-system-request header when asSystemRequest: true', async () => {
        expect(
          await browser.executeAsync(async (cb) => {
            window.__coreProvider.start.plugins.core_plugin_b.sendSystemRequest(true).then(cb);
          })
        ).to.be('/core_plugin_b/system_request says: "System request? true"');
      });

      it('should not send kbn-system-request header when asSystemRequest: false', async () => {
        expect(
          await browser.executeAsync(async (cb) => {
            window.__coreProvider.start.plugins.core_plugin_b.sendSystemRequest(false).then(cb);
          })
        ).to.be('/core_plugin_b/system_request says: "System request? false"');
      });
    });

    describe('Plugin static assets', function () {
      it('exposes static assets from "public/assets" folder', async () => {
        await supertest.get('/plugins/corePluginStaticAssets/assets/chart.svg').expect(200);
      });

      it('returns 404 if not found', async function () {
        await supertest.get('/plugins/corePluginStaticAssets/assets/not-a-chart.svg').expect(404);
      });

      it('does not expose folder content', async function () {
        await supertest.get('/plugins/corePluginStaticAssets/assets/').expect(403);
      });

      it('does not allow file tree traversing', async function () {
        await supertest.get('/plugins/corePluginStaticAssets/assets/../../kibana.json').expect(404);
      });

      it('generates "etag" & "last-modified" headers', async () => {
        const response = await supertest
          .get('/plugins/corePluginStaticAssets/assets/chart.svg')
          .expect(200);

        expect(response.header).to.have.property('etag');
        expect(response.header).to.have.property('last-modified');
      });

      it('generates the same "etag" & "last-modified" for the same asset', async () => {
        const firstResponse = await supertest
          .get('/plugins/corePluginStaticAssets/assets/chart.svg')
          .expect(200);

        expect(firstResponse.header).to.have.property('etag');

        const secondResponse = await supertest
          .get('/plugins/corePluginStaticAssets/assets/chart.svg')
          .expect(200);

        expect(secondResponse.header.etag).to.be(firstResponse.header.etag);
        expect(secondResponse.header['last-modified']).to.be(firstResponse.header['last-modified']);
      });
    });
  });
}
