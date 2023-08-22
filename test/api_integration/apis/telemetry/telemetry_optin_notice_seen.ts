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

  describe('/internal/telemetry/userHasSeenNotice API Telemetry User has seen OptIn Notice', () => {
    it('should update telemetry setting field via PUT', async () => {
      await client.savedObjects.delete({ type: 'telemetry', id: 'telemetry' });

      await supertest
        .put('/internal/telemetry/userHasSeenNotice')
        .set('kbn-xsrf', 'xxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

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
