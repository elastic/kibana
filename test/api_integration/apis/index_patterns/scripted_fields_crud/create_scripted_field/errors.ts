/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('errors', () => {
    it('returns an error field object is not provided', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      const id = response1.body.index_pattern.id;
      const response2 = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/scripted_field`)
        .send({});

      expect(response2.status).to.be(400);
      expect(response2.body.statusCode).to.be(400);
      expect(response2.body.message).to.be(
        '[request body.field.name]: expected value of type [string] but got [undefined]'
      );
    });

    it('returns an error when creating a non-scripted field', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      const id = response1.body.index_pattern.id;
      const response2 = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/scripted_field`)
        .send({
          field: {
            name: 'bar',
            type: 'number',
            scripted: false,
          },
        });

      expect(response2.status).to.be(400);
      expect(response2.body.statusCode).to.be(400);
      expect(response2.body.message).to.be('Only scripted fields can be created.');
    });
  });
}
