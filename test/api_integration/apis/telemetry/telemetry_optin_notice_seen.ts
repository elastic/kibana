/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client = getService('es');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/userHasSeenNotice API Telemetry User has seen OptIn Notice', () => {
    it('should update telemetry setting field via PUT', async () => {
      await client.delete(
        {
          index: '.kibana',
          id: 'telemetry:telemetry',
        },
        { ignore: [404] }
      );

      await supertest.put('/api/telemetry/v2/userHasSeenNotice').set('kbn-xsrf', 'xxx').expect(200);

      const {
        body: {
          _source: { telemetry },
        },
      } = await client.get({
        index: '.kibana',
        id: 'telemetry:telemetry',
      });

      expect(telemetry.userHasSeenNotice).to.be(true);
    });
  });
}
