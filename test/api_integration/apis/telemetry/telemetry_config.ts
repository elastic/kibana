/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client = getService('es');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/config API Telemetry config', () => {
    before(async () => {
      await client.delete(
        {
          index: '.kibana',
          id: 'telemetry:telemetry',
        },
        { ignore: [404] }
      );
    });

    it('GET should get the default config', async () => {
      await supertest.get('/api/telemetry/v2/config').set('kbn-xsrf', 'xxx').expect(200, {
        allowChangingOptInStatus: true,
        optIn: false, // the config.js for this FTR sets it to `false`
        sendUsageFrom: 'server',
        telemetryNotifyUserAboutOptInDefault: false, // it's not opted-in, so we don't notify about opt-in??
      });
    });

    it('GET should get when opted-in', async () => {
      // Opt-in
      await supertest
        .post('/api/telemetry/v2/optIn')
        .set('kbn-xsrf', 'xxx')
        .send({ enabled: true })
        .expect(200);

      await supertest.get('/api/telemetry/v2/config').set('kbn-xsrf', 'xxx').expect(200, {
        allowChangingOptInStatus: true,
        optIn: true,
        sendUsageFrom: 'server',
        // it's not opted-in (in the YAML config) despite being opted-in via API/UI, and we still say false??
        telemetryNotifyUserAboutOptInDefault: false,
      });
    });
  });
}
