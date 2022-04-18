/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { TelemetrySavedObjectAttributes } from '@kbn/telemetry-plugin/server/telemetry_repository';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('/api/telemetry/v2/optIn API', () => {
    let defaultAttributes: TelemetrySavedObjectAttributes;
    let kibanaVersion: any;
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      const kibanaVersionAccessor = kibanaServer.version;
      kibanaVersion = await kibanaVersionAccessor.get();
      defaultAttributes =
        (await getSavedObjectAttributes(supertest).catch((err) => {
          if (err.message === 'expected 200 "OK", got 404 "Not Found"') {
            return null;
          }
          throw err;
        })) || {};

      expect(typeof kibanaVersion).to.eql('string');
      expect(kibanaVersion.length).to.be.greaterThan(0);
    });

    afterEach(async () => {
      await updateSavedObjectAttributes(supertest, defaultAttributes);
    });

    it('should support sending false with allowChangingOptInStatus true', async () => {
      await updateSavedObjectAttributes(supertest, {
        ...defaultAttributes,
        allowChangingOptInStatus: true,
      });
      await postTelemetryV2Optin(supertest, false, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(supertest);
      expect(enabled).to.be(false);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should support sending true with allowChangingOptInStatus true', async () => {
      await updateSavedObjectAttributes(supertest, {
        ...defaultAttributes,
        allowChangingOptInStatus: true,
      });
      await postTelemetryV2Optin(supertest, true, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(supertest);
      expect(enabled).to.be(true);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should not support sending false with allowChangingOptInStatus false', async () => {
      await updateSavedObjectAttributes(supertest, {
        ...defaultAttributes,
        allowChangingOptInStatus: false,
      });
      await postTelemetryV2Optin(supertest, false, 400);
    });

    it('should not support sending true with allowChangingOptInStatus false', async () => {
      await updateSavedObjectAttributes(supertest, {
        ...defaultAttributes,
        allowChangingOptInStatus: false,
      });
      await postTelemetryV2Optin(supertest, true, 400);
    });

    it('should not support sending null', async () => {
      await postTelemetryV2Optin(supertest, null, 400);
    });

    it('should not support sending junk', async () => {
      await postTelemetryV2Optin(supertest, 42, 400);
    });
  });
}

async function postTelemetryV2Optin(supertest: any, value: any, statusCode: number): Promise<any> {
  const { body } = await supertest
    .post('/api/telemetry/v2/optIn')
    .set('kbn-xsrf', 'xxx')
    .send({ enabled: value })
    .expect(statusCode);

  return body;
}

async function updateSavedObjectAttributes(
  supertest: any,
  attributes: TelemetrySavedObjectAttributes
): Promise<any> {
  return await supertest
    .post('/api/saved_objects/telemetry/telemetry')
    .query({ overwrite: true })
    .set('kbn-xsrf', 'xxx')
    .send({ attributes })
    .expect(200);
}

async function getSavedObjectAttributes(supertest: any): Promise<TelemetrySavedObjectAttributes> {
  const { body } = await supertest.get('/api/saved_objects/telemetry/telemetry').expect(200);
  return body.attributes;
}
