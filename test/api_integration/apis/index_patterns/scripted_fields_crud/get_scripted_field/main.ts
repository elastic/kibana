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
    it('can fetch a scripted field', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          fields: {
            foo: {
              name: 'foo',
              type: 'string',
              scripted: true,
              script: "doc['field_name'].value",
            },
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
        '/api/index_patterns/index_pattern/' +
          response1.body.index_pattern.id +
          '/scripted_field/bar'
      );

      expect(response2.status).to.be(200);
      expect(typeof response2.body.field).to.be('object');
      expect(response2.body.field.name).to.be('bar');
      expect(response2.body.field.type).to.be('number');
      expect(response2.body.field.scripted).to.be(true);
      expect(response2.body.field.script).to.be("doc['field_name'].value");
    });
  });
}
