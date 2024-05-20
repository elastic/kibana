/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('/internal/telemetry/last_reported API Telemetry lastReported', () => {
    before(async () => {
      await client.savedObjects.delete({ type: 'telemetry', id: 'telemetry' });
    });

    it('GET should return undefined when there is no stored telemetry.lastReported value', async () => {
      await supertest
        .get('/internal/telemetry/last_reported')
        .set('kbn-xsrf', 'xxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200, {});
    });

    it('PUT should update telemetry.lastReported to now', async () => {
      await supertest
        .put('/internal/telemetry/last_reported')
        .set('kbn-xsrf', 'xxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

      const {
        attributes: { lastReported },
      } = await client.savedObjects.get<{ lastReported: number }>({
        type: 'telemetry',
        id: 'telemetry',
      });

      expect(lastReported).to.be.a('number');
    });

    it('GET should return the previously stored lastReported value', async () => {
      const {
        attributes: { lastReported },
      } = await client.savedObjects.get<{ lastReported: number }>({
        type: 'telemetry',
        id: 'telemetry',
      });

      expect(lastReported).to.be.a('number');

      await supertest
        .get('/internal/telemetry/last_reported')
        .set('kbn-xsrf', 'xxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200, { lastReported });
    });
  });
}
