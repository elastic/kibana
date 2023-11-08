/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { KBN_SCREENSHOT_MODE_ENABLED_KEY } from '@kbn/screenshot-mode-plugin/public';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { PluginFunctionalProviderContext } from '../../services';

const TELEMETRY_SO_TYPE = 'telemetry';
const TELEMETRY_SO_ID = 'telemetry';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const kbnClient = getService('kibanaServer');
  const browser = getService('browser');
  const find = getService('find');
  const supertest = getService('supertest');
  const PageObjects = getPageObjects(['common']);

  describe('Telemetry service', () => {
    describe('Screenshot mode', () => {
      const checkCanSendTelemetry = (): Promise<boolean> => {
        return browser.executeAsync<boolean>((cb) => {
          (window as unknown as Record<string, () => Promise<boolean>>)
            ._checkCanSendTelemetry()
            .then(cb);
        });
      };

      after(async () => {
        await browser.removeLocalStorageItem(KBN_SCREENSHOT_MODE_ENABLED_KEY);
        await browser.executeAsync<void>((cb) => {
          (window as unknown as Record<string, () => Promise<boolean>>)
            ._resetTelemetry()
            .then(() => cb());
        });
      });

      it('detects that telemetry cannot be sent in screenshot mode', async () => {
        await PageObjects.common.navigateToApp('home');
        expect(await checkCanSendTelemetry()).to.be(true);

        await browser.setLocalStorageItem(KBN_SCREENSHOT_MODE_ENABLED_KEY, 'true');
        await PageObjects.common.navigateToApp('home');

        expect(await checkCanSendTelemetry()).to.be(false);
      });
    });

    describe('Opt-in/out banners', function () {
      this.tags(['skipCloud']);

      // Get current values
      let attributes: Record<string, unknown>;
      let currentVersion: string;
      let previousMinor: string;

      before(async () => {
        [{ attributes }, currentVersion] = await Promise.all([
          kbnClient.savedObjects.get({ type: TELEMETRY_SO_TYPE, id: TELEMETRY_SO_ID }),
          kbnClient.version.get(),
        ]);

        const [major, minor, patch] = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/)!.map(parseInt);
        previousMinor = `${minor === 0 ? major - 1 : major}.${
          minor === 0 ? minor : minor - 1
        }.${patch}`;

        // Navigating first, so we can dismiss the welcome prompt, before deleting the telemetry SO.
        await PageObjects.common.navigateToApp('home');

        await kbnClient.savedObjects.delete({ type: TELEMETRY_SO_TYPE, id: TELEMETRY_SO_ID });
      });

      it('shows the banner in the default configuration', async () => {
        await PageObjects.common.navigateToApp('home');
        expect(await find.existsByLinkText('Enable usage collection.')).to.eql(true);
        expect(await find.existsByLinkText('Disable usage collection.')).to.eql(false);
      });

      it('does not show the banner if opted-in', async () => {
        await supertest
          .post('/internal/telemetry/optIn')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ enabled: true })
          .expect(200);

        await PageObjects.common.navigateToApp('home');
        expect(await find.existsByLinkText('Enable usage collection.')).to.eql(false);
        expect(await find.existsByLinkText('Disable usage collection.')).to.eql(false);
      });

      it('does not show the banner if opted-out in this version', async () => {
        await supertest
          .post('/internal/telemetry/optIn')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send({ enabled: false })
          .expect(200);

        await PageObjects.common.navigateToApp('home');
        expect(await find.existsByLinkText('Enable usage collection.')).to.eql(false);
        expect(await find.existsByLinkText('Disable usage collection.')).to.eql(false);
      });

      it('shows the banner if opted-out in a previous version', async () => {
        await kbnClient.savedObjects.create({
          overwrite: true,
          type: TELEMETRY_SO_TYPE,
          id: TELEMETRY_SO_ID,
          attributes: { ...attributes, enabled: false, lastVersionChecked: previousMinor },
        });

        await PageObjects.common.navigateToApp('home');
        expect(await find.existsByLinkText('Enable usage collection.')).to.eql(true);
        expect(await find.existsByLinkText('Disable usage collection.')).to.eql(false);
      });

      it('does not show the banner if opted-in in a previous version', async () => {
        await kbnClient.savedObjects.create({
          overwrite: true,
          type: TELEMETRY_SO_TYPE,
          id: TELEMETRY_SO_ID,
          attributes: { ...attributes, enabled: true, lastVersionChecked: previousMinor },
        });

        await PageObjects.common.navigateToApp('home');
        expect(await find.existsByLinkText('Enable usage collection.')).to.eql(false);
        expect(await find.existsByLinkText('Disable usage collection.')).to.eql(false);
      });
    });
  });
}
