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

    it('returns 404 error when short URL does not exist', async () => {
      const response = await supertest.get('/api/short_url/NotExistingID');

      expect(response.status).to.be(404);
    });

    it('supports legacy short URLs', async () => {
      const id = 'abcdefghjabcdefghjabcdefghjabcdefghj';
      await supertest.post('/api/saved_objects/url/' + id).send({
        attributes: {
          accessCount: 25,
          accessDate: 1632672537546,
          createDate: 1632672507685,
          url: '/app/dashboards#/view/123',
        },
      });
      const response = await supertest.get('/api/short_url/' + id);
      await supertest.delete('/api/saved_objects/url/' + id).send();

      expect(response.body.id).to.be(id);
      expect(response.body.slug).to.be(id);
      expect(response.body.locator).to.eql({
        id: 'LEGACY_SHORT_URL_LOCATOR',
        version: '7.15.0',
        state: { url: '/app/dashboards#/view/123' },
      });
      expect(response.body.accessCount).to.be(25);
      expect(response.body.accessDate).to.be(1632672537546);
      expect(response.body.createDate).to.be(1632672507685);
    });
  });
}
