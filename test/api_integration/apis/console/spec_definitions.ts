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

  describe('GET /api/console/api_server', () => {
    it('returns autocomplete definitions', async () => {
      const { body } = await supertest
        .get('/api/console/api_server')
        .set('kbn-xsrf', 'true')
        .expect(200);
      expect(body.es).to.be.ok();
      const {
        es: { name, globals, endpoints },
      } = body;
      expect(name).to.be.ok();
      expect(Object.keys(globals).length).to.be.above(0);
      expect(Object.keys(endpoints).length).to.be.above(0);
    });
  });
}
