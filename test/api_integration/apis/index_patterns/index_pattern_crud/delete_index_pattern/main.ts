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

  describe('main', () => {
    it('deletes an index_pattern', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      const response2 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response2.status).to.be(200);

      const response3 = await supertest.delete(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response3.status).to.be(200);

      const response4 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response4.status).to.be(404);
    });

    it('returns nothing', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      await supertest.get('/api/index_patterns/index_pattern/' + response1.body.index_pattern.id);
      const response2 = await supertest.delete(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(!!response2.body).to.be(false);
    });
  });
}
