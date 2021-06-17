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

    it('can delete a runtime field', async () => {
      const title = `basic_index*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        override: true,
        index_pattern: {
          title,
          runtimeFieldMap: {
            runtimeBar: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          },
        },
      });

      const response2 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(typeof response2.body.index_pattern.fields.runtimeBar).to.be('object');

      const response3 = await supertest.delete(
        `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/runtime_field/runtimeBar`
      );

      expect(response3.status).to.be(200);

      const response4 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(typeof response4.body.index_pattern.fields.runtimeBar).to.be('undefined');
      await supertest.delete(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );
    });
  });
}
