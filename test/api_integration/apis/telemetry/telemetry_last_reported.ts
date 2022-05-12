/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client = getService('es');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/last_reported API Telemetry lastReported', () => {
    before(async () => {
      await client.delete(
        {
          index: '.kibana',
          id: 'telemetry:telemetry',
        },
        { ignore: [404] }
      );
    });

    it('GET should return undefined when there is no stored telemetry.lastReported value', async () => {
      await supertest
        .get('/api/telemetry/v2/last_reported')
        .set('kbn-xsrf', 'xxx')
        .expect(200, { lastReported: undefined });
    });

    it('PUT should update telemetry.lastReported to now', async () => {
      await supertest.put('/api/telemetry/v2/last_reported').set('kbn-xsrf', 'xxx').expect(200);

      const { _source } = await client.get<{ telemetry: { lastReported: number } }>({
        index: '.kibana',
        id: 'telemetry:telemetry',
      });

      expect(_source?.telemetry.lastReported).to.be.a('number');
    });

    it('GET should return the previously stored lastReported value', async () => {
      const { _source } = await client.get<{ telemetry: { lastReported: number } }>({
        index: '.kibana',
        id: 'telemetry:telemetry',
      });

      expect(_source?.telemetry.lastReported).to.be.a('number');
      const lastReported = _source?.telemetry.lastReported;

      await supertest
        .get('/api/telemetry/v2/last_reported')
        .set('kbn-xsrf', 'xxx')
        .expect(200, { lastReported });
    });
  });
}
