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
    it('returns error when index_pattern object is not provided', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern/foo');

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body]: expected a plain object value, but found [null] instead.'
      );
    });

    it('returns error on non-existing index_pattern', async () => {
      const response = await supertest
        .post('/api/index_patterns/index_pattern/non-existing-index-pattern')
        .send({
          index_pattern: {},
        });

      expect(response.status).to.be(404);
      expect(response.body.statusCode).to.be(404);
      expect(response.body.message).to.be(
        'Saved object [index-pattern/non-existing-index-pattern] not found'
      );
    });

    it('returns error when "refresh_fields" parameter is not a boolean', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern/foo`').send({
        refresh_fields: 123,
        index_pattern: {
          title: 'foo',
        },
      });

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.refresh_fields]: expected value of type [boolean] but got [number]'
      );
    });

    it('returns error when update patch is empty', async () => {
      const title1 = `foo-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title: title1,
        },
      });
      const id = response.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {},
      });

      expect(response2.status).to.be(400);
      expect(response2.body.statusCode).to.be(400);
      expect(response2.body.message).to.be('Index pattern change set is empty.');
    });
  });
}
