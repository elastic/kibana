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

  describe('validation', () => {
    it('returns error when index_pattern object is not provided', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern');

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body]: expected a plain object value, but found [null] instead.'
      );
    });

    it('returns error on empty index_pattern object', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {},
      });

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.index_pattern.title]: expected value of type [string] but got [undefined]'
      );
    });

    it('returns error when "override" parameter is not a boolean', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        override: 123,
        index_pattern: {
          title: 'foo',
        },
      });

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.override]: expected value of type [boolean] but got [number]'
      );
    });

    it('returns error when "refresh_fields" parameter is not a boolean', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
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
  });
}
