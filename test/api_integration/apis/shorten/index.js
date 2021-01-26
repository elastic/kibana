/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('url shortener', () => {
    before(() => esArchiver.load('saved_objects/basic'));
    after(() => esArchiver.unload('saved_objects/basic'));

    it('generates shortened urls', async () => {
      const resp = await supertest
        .post('/api/shorten_url')
        .set('content-type', 'application/json')
        .send({ url: '/app/visualize#/create' })
        .expect(200);

      expect(resp.body).to.have.property('urlId');
      expect(typeof resp.body.urlId).to.be('string');
      expect(resp.body.urlId.length > 0).to.be(true);
    });

    it('redirects shortened urls', async () => {
      const resp = await supertest
        .post('/api/shorten_url')
        .set('content-type', 'application/json')
        .send({ url: '/app/visualize#/create' });

      const urlId = resp.body.urlId;
      await supertest
        .get(`/goto/${urlId}`)
        .expect(302)
        .expect('location', '/app/visualize#/create');
    });
  });
}
