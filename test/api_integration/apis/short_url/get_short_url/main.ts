/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('can fetch a newly created short URL', async () => {
      const response1 = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {},
      });
      const response2 = await supertest.get('/api/short_url/' + response1.body.id);

      expect(response2.body).to.eql(response1.body);
    });
  });
}
