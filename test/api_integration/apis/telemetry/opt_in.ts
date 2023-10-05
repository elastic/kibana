/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import SuperTest from 'supertest';
import type { KbnClient } from '@kbn/test';
import type { TelemetrySavedObjectAttributes } from '@kbn/telemetry-plugin/server/saved_objects';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('/internal/telemetry/optIn API', () => {
    let defaultAttributes: TelemetrySavedObjectAttributes;
    let kibanaVersion: string;
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      const kibanaVersionAccessor = kibanaServer.version;
      kibanaVersion = await kibanaVersionAccessor.get();
      defaultAttributes = await getSavedObjectAttributes(kibanaServer);

      expect(typeof kibanaVersion).to.eql('string');
      expect(kibanaVersion.length).to.be.greaterThan(0);
    });

    afterEach(async () => {
      await updateSavedObjectAttributes(kibanaServer, defaultAttributes);
    });

    it('should support sending false with allowChangingOptInStatus true', async () => {
      await updateSavedObjectAttributes(kibanaServer, {
        allowChangingOptInStatus: true,
      });
      await postTelemetryV2OptIn(supertest, false, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(kibanaServer);
      expect(enabled).to.be(false);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should support sending true with allowChangingOptInStatus true', async () => {
      await updateSavedObjectAttributes(kibanaServer, {
        ...defaultAttributes,
        allowChangingOptInStatus: true,
      });
      await postTelemetryV2OptIn(supertest, true, 200);
      const { enabled, lastVersionChecked } = await getSavedObjectAttributes(kibanaServer);
      expect(enabled).to.be(true);
      expect(lastVersionChecked).to.be(kibanaVersion);
    });

    it('should not support sending false with allowChangingOptInStatus false', async () => {
      await updateSavedObjectAttributes(kibanaServer, {
        ...defaultAttributes,
        allowChangingOptInStatus: false,
      });
      await postTelemetryV2OptIn(supertest, false, 400);
    });

    it('should not support sending true with allowChangingOptInStatus false', async () => {
      await updateSavedObjectAttributes(kibanaServer, {
        ...defaultAttributes,
        allowChangingOptInStatus: false,
      });
      await postTelemetryV2OptIn(supertest, true, 400);
    });

    it('should not support sending null', async () => {
      await postTelemetryV2OptIn(supertest, null, 400);
    });

    it('should not support sending junk', async () => {
      await postTelemetryV2OptIn(supertest, 42, 400);
    });
  });
}

async function postTelemetryV2OptIn(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  value: unknown,
  statusCode: number
): Promise<any> {
  const { body } = await supertest
    .post('/internal/telemetry/optIn')
    .set('kbn-xsrf', 'xxx')
    .set(ELASTIC_HTTP_VERSION_HEADER, '2')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({ enabled: value })
    .expect(statusCode);

  return body;
}

async function updateSavedObjectAttributes(
  client: KbnClient,
  attributes: TelemetrySavedObjectAttributes
): Promise<void> {
  await client.savedObjects.create({
    type: 'telemetry',
    id: 'telemetry',
    overwrite: true,
    attributes,
  });
}

async function getSavedObjectAttributes(
  client: KbnClient
): Promise<TelemetrySavedObjectAttributes> {
  try {
    const body = await client.savedObjects.get<TelemetrySavedObjectAttributes>({
      type: 'telemetry',
      id: 'telemetry',
    });

    return body.attributes;
  } catch (err) {
    if (err.response?.status === 404) {
      return {};
    }
    throw err;
  }
}
