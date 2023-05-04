/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-provider-plugin/types';

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
            return window._coreProvider.setup.plugins.corePluginB.sayHi();
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
            const [coreStart] = await window._coreProvider.setup.core.getStartServices();
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
            window._coreProvider.start.plugins.corePluginB.sendSystemRequest(true).then(cb);
          })
        ).to.be('/core_plugin_b/system_request says: "System request? true"');
      });

      it('should not send kbn-system-request header when asSystemRequest: false', async () => {
        expect(
          await browser.executeAsync(async (cb) => {
            window._coreProvider.start.plugins.corePluginB.sendSystemRequest(false).then(cb);
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
