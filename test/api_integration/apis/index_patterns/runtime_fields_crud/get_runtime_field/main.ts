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
        it('can fetch a runtime field', async () => {
          const title = `basic_index*`;
          const response1 = await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title,
              runtimeFieldMap: {
                runtimeFoo: {
                  type: 'keyword',
                  script: {
                    source: "emit(doc['field_name'].value)",
                  },
                },
                runtimeBar: {
                  type: 'keyword',
                  script: {
                    source: "emit(doc['field_name'].value)",
                  },
                },
              },
            },
          });

          expect(response1.status).to.be(200);

          const response2 = await supertest.get(
            `${config.path}/${response1.body[config.serviceKey].id}/runtime_field/runtimeFoo`
          );

          const field =
            config.serviceKey === 'index_pattern' ? response2.body.field : response2.body.fields[0];

          expect(response2.status).to.be(200);
          expect(response2.body[config.serviceKey]).to.not.be.empty();
          expect(typeof field).to.be('object');
          expect(field.name).to.be('runtimeFoo');
          expect(field.type).to.be('string');
          expect(field.scripted).to.be(false);
          expect(field.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
          await supertest.delete(`${config.path}/${response1.body[config.serviceKey].id}`);
        });
      });
    });
  });
}
