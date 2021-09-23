/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('main', () => {
    before(async () => {
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });

    it('can overwrite an existing field', async () => {
      const title = `basic_index`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        override: true,
        index_pattern: {
          title,
          runtimeFieldMap: {
            runtimeFoo: {
              type: 'keyword',
              script: {
                source: "doc['field_name'].value",
              },
            },
            runtimeBar: {
              type: 'keyword',
              script: {
                source: "doc['field_name'].value",
              },
            },
          },
        },
      });

      const response2 = await supertest
        .put(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/runtime_field`)
        .send({
          name: 'runtimeFoo',
          runtimeField: {
            type: 'long',
            script: {
              source: "doc['field_name'].value",
            },
          },
        });

      expect(response2.status).to.be(200);

      const response3 = await supertest.get(
        '/api/index_patterns/index_pattern/' +
          response1.body.index_pattern.id +
          '/runtime_field/runtimeFoo'
      );

      expect(response3.status).to.be(200);
      expect(response3.body.field.type).to.be('number');

      const response4 = await supertest.get(
        '/api/index_patterns/index_pattern/' +
          response1.body.index_pattern.id +
          '/runtime_field/runtimeBar'
      );

      expect(response4.status).to.be(200);
      expect(response4.body.field.type).to.be('string');
    });

    it('can add a new runtime field', async () => {
      const title = `basic_index`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        override: true,
        index_pattern: {
          title,
          runtimeFieldMap: {
            runtimeFoo: {
              type: 'keyword',
              script: {
                source: "doc['field_name'].value",
              },
            },
          },
        },
      });

      await supertest
        .put(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/runtime_field`)
        .send({
          name: 'runtimeBar',
          runtimeField: {
            type: 'long',
            script: {
              source: "doc['field_name'].value",
            },
          },
        });

      const response2 = await supertest.get(
        '/api/index_patterns/index_pattern/' +
          response1.body.index_pattern.id +
          '/runtime_field/runtimeBar'
      );

      expect(response2.status).to.be(200);
      expect(typeof response2.body.field.runtimeField).to.be('object');
    });
  });
}
