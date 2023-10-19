/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxiosError } from 'axios';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

const TELEMETRY_SO_TYPE = 'telemetry';
const TELEMETRY_SO_ID = 'telemetry';

export default function telemetryConfigTest({ getService }: FtrProviderContext) {
  const kbnClient = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('API Telemetry config', () => {
    ['/api/telemetry/v2/config', '/internal/telemetry/config'].forEach((api) => {
      describe(`GET ${api}`, () => {
        const apiVersion = api === '/api/telemetry/v2/config' ? '2023-10-31' : '2';
        before(async () => {
          try {
            await kbnClient.savedObjects.delete({ type: TELEMETRY_SO_TYPE, id: TELEMETRY_SO_ID });
          } catch (err) {
            const is404Error = err instanceof AxiosError && err.response?.status === 404;
            if (!is404Error) {
              throw err;
            }
          }
        });

        it('GET should get the default config', async () => {
          await supertest
            .get(api)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200, {
              allowChangingOptInStatus: true,
              optIn: null, // the config.js for this FTR sets it to `false`, we are bound to ask again.
              sendUsageFrom: 'server',
              telemetryNotifyUserAboutOptInDefault: false, // it's not opted-in by default (that's what this flag is about)
              labels: {},
            });
        });

        it('GET should get `true` when opted-in', async () => {
          // Opt-in
          await supertest
            .post('/internal/telemetry/optIn')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, '2')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({ enabled: true })
            .expect(200);

          await supertest
            .get(api)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200, {
              allowChangingOptInStatus: true,
              optIn: true,
              sendUsageFrom: 'server',
              telemetryNotifyUserAboutOptInDefault: false,
              labels: {},
            });
        });

        it('GET should get false when opted-out', async () => {
          // Opt-in
          await supertest
            .post('/internal/telemetry/optIn')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, '2')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({ enabled: false })
            .expect(200);

          await supertest
            .get(api)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200, {
              allowChangingOptInStatus: true,
              optIn: false,
              sendUsageFrom: 'server',
              telemetryNotifyUserAboutOptInDefault: false,
              labels: {},
            });
        });

        describe('From a previous version', function () {
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

            const [major, minor, patch] = currentVersion
              .match(/^(\d+)\.(\d+)\.(\d+)/)!
              .map(parseInt);
            previousMinor = `${minor === 0 ? major - 1 : major}.${
              minor === 0 ? minor : minor - 1
            }.${patch}`;
          });

          it('GET should get `true` when opted-in in the current version', async () => {
            // Opt-in from a previous version
            await kbnClient.savedObjects.create({
              overwrite: true,
              type: TELEMETRY_SO_TYPE,
              id: TELEMETRY_SO_ID,
              attributes: { ...attributes, enabled: true, lastVersionChecked: previousMinor },
            });

            await supertest
              .get(api)
              .set('kbn-xsrf', 'xxx')
              .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
              .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
              .expect(200, {
                allowChangingOptInStatus: true,
                optIn: true,
                sendUsageFrom: 'server',
                telemetryNotifyUserAboutOptInDefault: false,
                labels: {},
              });
          });

          it('GET should get `null` when opted-out in a previous version', async () => {
            // Opt-out from previous version
            await kbnClient.savedObjects.create({
              overwrite: true,
              type: TELEMETRY_SO_TYPE,
              id: TELEMETRY_SO_ID,
              attributes: { ...attributes, enabled: false, lastVersionChecked: previousMinor },
            });

            await supertest
              .get(api)
              .set('kbn-xsrf', 'xxx')
              .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
              .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
              .expect(200, {
                allowChangingOptInStatus: true,
                optIn: null,
                sendUsageFrom: 'server',
                telemetryNotifyUserAboutOptInDefault: false,
                labels: {},
              });
          });
        });
      });
    });
  });
}
