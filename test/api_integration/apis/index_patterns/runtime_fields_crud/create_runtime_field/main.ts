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

  describe('main', () => {
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
        it('can create a new runtime field', async () => {
          const title = `basic_index*`;
          const response1 = await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title,
            },
          });
          const id = response1.body[config.serviceKey].id;
          const response2 = await supertest.post(`${config.path}/${id}/runtime_field`).send({
            name: 'runtimeBar',
            runtimeField: {
              type: 'long',
              script: {
                source: "emit(doc['field_name'].value)",
              },
            },
          });

          expect(response2.status).to.be(200);
          const field =
            config.serviceKey === 'index_pattern' ? response2.body.field : response2.body.fields[0];

          expect(field.name).to.be('runtimeBar');
          expect(field.runtimeField.type).to.be('long');
          expect(field.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
          expect(field.scripted).to.be(false);
        });

        it('newly created runtime field is available in the index_pattern object', async () => {
          const title = `basic_index`;
          const response1 = await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title,
            },
          });

          await supertest
            .post(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
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
            `${config.path}/${response1.body[config.serviceKey].id}`
          );

          expect(response2.status).to.be(200);

          const field = response2.body[config.serviceKey].fields.runtimeBar;

          expect(field.name).to.be('runtimeBar');
          expect(field.runtimeField.type).to.be('long');
          expect(field.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
          expect(field.scripted).to.be(false);
          await supertest.delete(`${config.path}/${response1.body[config.serviceKey].id}`);
        });
      });
    });
  });
}
