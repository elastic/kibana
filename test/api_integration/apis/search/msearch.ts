/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('msearch', () => {
    describe('post', () => {
      it('should return 200 when correctly formatted searches are provided', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [
              {
                header: { index: 'foo' },
                body: {
                  query: {
                    match_all: {},
                  },
                },
              },
            ],
          })
          .expect(200));

      it('should return 400 if you provide malformed content', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            foo: false,
          })
          .expect(400));

      it('should require you to provide an index for each request', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [
              { header: { index: 'foo' }, body: {} },
              { header: {}, body: {} },
            ],
          })
          .expect(400));

      it('should not require optional params', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [{ header: { index: 'foo' }, body: {} }],
          })
          .expect(200));

      it('should allow passing preference as a string', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [{ header: { index: 'foo', preference: '_custom' }, body: {} }],
          })
          .expect(200));

      it('should allow passing preference as a number', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [{ header: { index: 'foo', preference: 123 }, body: {} }],
          })
          .expect(200));
    });
  });
}
