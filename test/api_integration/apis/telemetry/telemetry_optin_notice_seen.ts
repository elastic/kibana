/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/userHasSeenNotice API Telemetry User has seen OptIn Notice', () => {
    it('should update telemetry setting field via PUT', async () => {
      await client.savedObjects.delete({ type: 'telemetry', id: 'telemetry' });

      await supertest.put('/api/telemetry/v2/userHasSeenNotice').set('kbn-xsrf', 'xxx').expect(200);

      const {
        attributes: { userHasSeenNotice },
      } = await client.savedObjects.get<{ userHasSeenNotice: boolean }>({
        type: 'telemetry',
        id: 'telemetry',
      });

      expect(userHasSeenNotice).to.be(true);
    });
  });
}
