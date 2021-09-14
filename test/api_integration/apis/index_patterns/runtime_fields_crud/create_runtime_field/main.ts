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

    it('can create a new runtime field', async () => {
      const title = `basic_index*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        override: true,
        index_pattern: {
          title,
        },
      });
      const id = response1.body.index_pattern.id;
      const response2 = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/runtime_field`)
        .send({
          name: 'runtimeBar',
          runtimeField: {
            type: 'long',
            script: {
              source: "emit(doc['field_name'].value)",
            },
          },
        });

      expect(response2.status).to.be(200);
      expect(response2.body.field.name).to.be('runtimeBar');
      expect(response2.body.field.runtimeField.type).to.be('long');
      expect(response2.body.field.runtimeField.script.source).to.be(
        "emit(doc['field_name'].value)"
      );
      expect(response2.body.field.scripted).to.be(false);
    });

    it('newly created runtime field is available in the index_pattern object', async () => {
      const title = `basic_index`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        override: true,
        index_pattern: {
          title,
        },
      });

      await supertest
        .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/runtime_field`)
        .send({
          name: 'runtimeBar',
          runtimeField: {
            type: 'long',
            script: {
              source: "emit(doc['field_name'].value)",
            },
          },
        });

      const response2 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response2.status).to.be(200);

      const field = response2.body.index_pattern.fields.runtimeBar;

      expect(field.name).to.be('runtimeBar');
      expect(field.runtimeField.type).to.be('long');
      expect(field.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
      expect(field.scripted).to.be(false);
      await supertest.delete(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );
    });
  });
}
