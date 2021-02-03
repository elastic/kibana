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
    it('can remove a scripted field', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          fields: {
            bar: {
              name: 'bar',
              type: 'number',
              scripted: true,
              script: "doc['field_name'].value",
            },
          },
        },
      });

      const response2 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(typeof response2.body.index_pattern.fields.bar).to.be('object');

      const response3 = await supertest.delete(
        `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/scripted_field/bar`
      );

      expect(response3.status).to.be(200);

      const response4 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(typeof response4.body.index_pattern.fields.bar).to.be('undefined');
    });
  });
}
