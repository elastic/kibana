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
    it('can resolve a short URL by its slug', async () => {
      const rnd = Math.round(Math.random() * 1e6) + 1;
      const slug = 'test-slug-' + Date.now() + '-' + rnd;
      const response1 = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {},
        slug,
      });
      const response2 = await supertest.get('/api/short_url/_slug/' + slug);

      expect(response2.body).to.eql(response1.body);
    });

    it('returns 404 error when short URL does not exist', async () => {
      const response = await supertest.get('/api/short_url/_slug/not-existing-slug');

      expect(response.status).to.be(404);
    });

    it('can resolve a short URL by its slug, when slugs are similar', async () => {
      const rnd = Math.round(Math.random() * 1e6) + 1;
      const now = Date.now();
      const slug1 = 'test-slug-' + now + '-' + rnd + '.1';
      const slug2 = 'test-slug-' + now + '-' + rnd + '.2';
      const response1 = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {
          url: '/path1',
        },
        slug: slug1,
      });
      const response2 = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {
          url: '/path2',
        },
        slug: slug2,
      });
      const response3 = await supertest.get('/api/short_url/_slug/' + slug1);
      const response4 = await supertest.get('/api/short_url/_slug/' + slug2);

      expect(response1.body).to.eql(response3.body);
      expect(response2.body).to.eql(response4.body);
    });
  });
}
