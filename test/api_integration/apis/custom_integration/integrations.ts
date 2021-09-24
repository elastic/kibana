/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get list of append integrations', () => {
    it('should return list of custom integrations that can be appended', async () => {
      const resp = await supertest
        .get(`/api/customIntegrations/appendCustomIntegrations`)
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      expect(resp.body).to.be.an('array');
      expect(resp.body.length).to.be.above(0);
    });
  });
}
