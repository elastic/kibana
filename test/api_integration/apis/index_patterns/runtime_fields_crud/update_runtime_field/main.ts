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

    it('can update an existing field', async () => {
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
        .post(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/runtime_field/runtimeFoo`
        )
        .send({
          runtimeField: {
            script: {
              source: "doc['something_new'].value",
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
      expect(response3.body.field.type).to.be('string');
      expect(response3.body.field.runtimeField.type).to.be('keyword');
      expect(response3.body.field.runtimeField.script.source).to.be("doc['something_new'].value");
    });
  });
}
