/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('errors', () => {
    before(async () => {
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });

    configArray.forEach((config) => {
      describe(config.name, () => {
        it('returns 404 error on non-existing index_pattern', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertest.put(`${config.path}/${id}/runtime_field`).send({
            name: 'runtimeBar',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          });

          expect(response.status).to.be(404);
        });

        it('returns error on non-runtime field update attempt', async () => {
          const title = `basic_index`;
          const response1 = await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title,
            },
          });

          const response2 = await supertest
            .put(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .send({
              name: 'bar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          expect(response2.status).to.be(400);
          expect(response2.body.message).to.be('Only runtime fields can be updated');
        });
      });
    });
  });
}
