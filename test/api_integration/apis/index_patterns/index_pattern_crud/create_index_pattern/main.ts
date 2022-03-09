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
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('can create an index_pattern with just a title', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
            },
          });

          expect(response.status).to.be(200);
        });

        it('returns back the created index_pattern object', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
            },
          });

          expect(typeof response.body[config.serviceKey]).to.be('object');
          expect(response.body[config.serviceKey].title).to.be(title);
          expect(typeof response.body[config.serviceKey].id).to.be('string');
          expect(response.body[config.serviceKey].id.length > 0).to.be(true);
        });

        it('can specify primitive optional attributes when creating an index pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const id = `test-id-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
              id,
              type: 'test-type',
              timeFieldName: 'test-timeFieldName',
            },
          });

          expect(response.status).to.be(200);
          expect(response.body[config.serviceKey].title).to.be(title);
          expect(response.body[config.serviceKey].id).to.be(id);
          expect(response.body[config.serviceKey].type).to.be('test-type');
          expect(response.body[config.serviceKey].timeFieldName).to.be('test-timeFieldName');
        });

        it('can specify optional sourceFilters attribute when creating an index pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
              sourceFilters: [
                {
                  value: 'foo',
                },
              ],
            },
          });

          expect(response.status).to.be(200);
          expect(response.body[config.serviceKey].title).to.be(title);
          expect(response.body[config.serviceKey].sourceFilters[0].value).to.be('foo');
        });

        describe('creating fields', () => {
          before(async () => {
            await esArchiver.load(
              'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
            );
          });

          after(async () => {
            await esArchiver.unload(
              'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
            );
          });

          it('can specify optional fields attribute when creating an index pattern', async () => {
            const title = `basic_index*`;
            const response = await supertest.post(config.path).send({
              override: true,
              [config.serviceKey]: {
                title,
                fields: {
                  foo: {
                    name: 'foo',
                    type: 'string',
                    scripted: true,
                    script: "doc['field_name'].value",
                  },
                },
              },
            });

            expect(response.status).to.be(200);
            expect(response.body[config.serviceKey].title).to.be(title);
            expect(response.body[config.serviceKey].fields.foo.name).to.be('foo');
            expect(response.body[config.serviceKey].fields.foo.type).to.be('string');
            expect(response.body[config.serviceKey].fields.foo.scripted).to.be(true);
            expect(response.body[config.serviceKey].fields.foo.script).to.be(
              "doc['field_name'].value"
            );

            expect(response.body[config.serviceKey].fields.bar.name).to.be('bar'); // created from es index
            expect(response.body[config.serviceKey].fields.bar.type).to.be('boolean');
          });

          it('can add scripted fields, other fields created from es index', async () => {
            const title = `basic_index*`;
            const response = await supertest.post(config.path).send({
              override: true,
              [config.serviceKey]: {
                title,
                fields: {
                  foo: {
                    name: 'foo',
                    type: 'string',
                  },
                  fake: {
                    name: 'fake',
                    type: 'string',
                  },
                  bar: {
                    name: 'bar',
                    type: 'number',
                    count: 123,
                    script: '',
                    esTypes: ['test-type'],
                    scripted: true,
                  },
                },
              },
            });

            expect(response.status).to.be(200);
            expect(response.body[config.serviceKey].title).to.be(title);

            expect(response.body[config.serviceKey].fields.foo.name).to.be('foo');
            expect(response.body[config.serviceKey].fields.foo.type).to.be('number'); // picked up from index

            expect(response.body[config.serviceKey].fields.fake).to.be(undefined); // not in index, so not created

            expect(response.body[config.serviceKey].fields.bar.name).to.be('bar');
            expect(response.body[config.serviceKey].fields.bar.type).to.be('number');
            expect(response.body[config.serviceKey].fields.bar.count).to.be(123);
            expect(response.body[config.serviceKey].fields.bar.script).to.be('');
            expect(response.body[config.serviceKey].fields.bar.esTypes[0]).to.be('test-type');
            expect(response.body[config.serviceKey].fields.bar.scripted).to.be(true);
          });

          it('can add runtime fields', async () => {
            const title = `basic_index*`;
            const response = await supertest.post(config.path).send({
              override: true,
              [config.serviceKey]: {
                title,
                runtimeFieldMap: {
                  runtimeFoo: {
                    type: 'keyword',
                    script: {
                      source: 'emit(doc["foo"].value)',
                    },
                  },
                },
              },
            });

            expect(response.status).to.be(200);
            expect(response.body[config.serviceKey].title).to.be(title);

            expect(response.body[config.serviceKey].runtimeFieldMap.runtimeFoo.type).to.be(
              'keyword'
            );
            expect(response.body[config.serviceKey].runtimeFieldMap.runtimeFoo.script.source).to.be(
              'emit(doc["foo"].value)'
            );
          });
        });

        it('can specify optional typeMeta attribute when creating an index pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
              typeMeta: {},
            },
          });

          expect(response.status).to.be(200);
        });

        it('can specify optional fieldFormats attribute when creating an index pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
              fieldFormats: {
                foo: {
                  id: 'test-id',
                  params: {},
                },
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body[config.serviceKey].fieldFormats.foo.id).to.be('test-id');
          expect(response.body[config.serviceKey].fieldFormats.foo.params).to.eql({});
        });

        it('can specify optional fieldFormats attribute when creating an index pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
              fieldAttrs: {
                foo: {
                  count: 123,
                  customLabel: 'test',
                },
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body[config.serviceKey].fieldAttrs.foo.count).to.be(123);
          expect(response.body[config.serviceKey].fieldAttrs.foo.customLabel).to.be('test');
        });

        describe('when creating index pattern with existing title', () => {
          it('returns error, by default', async () => {
            const title = `foo-${Date.now()}-${Math.random()}*`;
            const response1 = await supertest.post(config.path).send({
              [config.serviceKey]: {
                title,
              },
            });
            const response2 = await supertest.post(config.path).send({
              [config.serviceKey]: {
                title,
              },
            });

            expect(response1.status).to.be(200);
            expect(response2.status).to.be(400);
          });

          it('succeeds, override flag is set', async () => {
            const title = `foo-${Date.now()}-${Math.random()}*`;
            const response1 = await supertest.post(config.path).send({
              [config.serviceKey]: {
                title,
                timeFieldName: 'foo',
              },
            });
            const response2 = await supertest.post(config.path).send({
              override: true,
              [config.serviceKey]: {
                title,
                timeFieldName: 'bar',
              },
            });

            expect(response1.status).to.be(200);
            expect(response2.status).to.be(200);

            expect(response1.body[config.serviceKey].timeFieldName).to.be('foo');
            expect(response2.body[config.serviceKey].timeFieldName).to.be('bar');

            expect(response1.body[config.serviceKey].id).to.be(
              response1.body[config.serviceKey].id
            );
          });
        });
      });
    });
  });
}
