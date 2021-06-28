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
    it('can create an index_pattern with just a title', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });

      expect(response.status).to.be(200);
    });

    it('returns back the created index_pattern object', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });

      expect(typeof response.body.index_pattern).to.be('object');
      expect(response.body.index_pattern.title).to.be(title);
      expect(typeof response.body.index_pattern.id).to.be('string');
      expect(response.body.index_pattern.id.length > 0).to.be(true);
    });

    it('can specify primitive optional attributes when creating an index pattern', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const id = `test-id-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          id,
          type: 'test-type',
          timeFieldName: 'test-timeFieldName',
        },
      });

      expect(response.status).to.be(200);
      expect(response.body.index_pattern.title).to.be(title);
      expect(response.body.index_pattern.id).to.be(id);
      expect(response.body.index_pattern.type).to.be('test-type');
      expect(response.body.index_pattern.timeFieldName).to.be('test-timeFieldName');
    });

    it('can specify optional sourceFilters attribute when creating an index pattern', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          sourceFilters: [
            {
              value: 'foo',
            },
          ],
        },
      });

      expect(response.status).to.be(200);
      expect(response.body.index_pattern.title).to.be(title);
      expect(response.body.index_pattern.sourceFilters[0].value).to.be('foo');
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
        const response = await supertest.post('/api/index_patterns/index_pattern').send({
          override: true,
          index_pattern: {
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
        expect(response.body.index_pattern.title).to.be(title);
        expect(response.body.index_pattern.fields.foo.name).to.be('foo');
        expect(response.body.index_pattern.fields.foo.type).to.be('string');
        expect(response.body.index_pattern.fields.foo.scripted).to.be(true);
        expect(response.body.index_pattern.fields.foo.script).to.be("doc['field_name'].value");

        expect(response.body.index_pattern.fields.bar.name).to.be('bar'); // created from es index
        expect(response.body.index_pattern.fields.bar.type).to.be('boolean');
      });

      it('can add scripted fields, other fields created from es index', async () => {
        const title = `basic_index*`;
        const response = await supertest.post('/api/index_patterns/index_pattern').send({
          override: true,
          index_pattern: {
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
        expect(response.body.index_pattern.title).to.be(title);

        expect(response.body.index_pattern.fields.foo.name).to.be('foo');
        expect(response.body.index_pattern.fields.foo.type).to.be('number'); // picked up from index

        expect(response.body.index_pattern.fields.fake).to.be(undefined); // not in index, so not created

        expect(response.body.index_pattern.fields.bar.name).to.be('bar');
        expect(response.body.index_pattern.fields.bar.type).to.be('number');
        expect(response.body.index_pattern.fields.bar.count).to.be(123);
        expect(response.body.index_pattern.fields.bar.script).to.be('');
        expect(response.body.index_pattern.fields.bar.esTypes[0]).to.be('test-type');
        expect(response.body.index_pattern.fields.bar.scripted).to.be(true);
      });

      it('can add runtime fields', async () => {
        const title = `basic_index*`;
        const response = await supertest.post('/api/index_patterns/index_pattern').send({
          override: true,
          index_pattern: {
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
        expect(response.body.index_pattern.title).to.be(title);

        expect(response.body.index_pattern.runtimeFieldMap.runtimeFoo.type).to.be('keyword');
        expect(response.body.index_pattern.runtimeFieldMap.runtimeFoo.script.source).to.be(
          'emit(doc["foo"].value)'
        );
      });
    });

    it('can specify optional typeMeta attribute when creating an index pattern', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          typeMeta: {},
        },
      });

      expect(response.status).to.be(200);
    });

    it('can specify optional fieldFormats attribute when creating an index pattern', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
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
      expect(response.body.index_pattern.fieldFormats.foo.id).to.be('test-id');
      expect(response.body.index_pattern.fieldFormats.foo.params).to.eql({});
    });

    it('can specify optional fieldFormats attribute when creating an index pattern', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
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
      expect(response.body.index_pattern.fieldAttrs.foo.count).to.be(123);
      expect(response.body.index_pattern.fieldAttrs.foo.customLabel).to.be('test');
    });

    describe('when creating index pattern with existing title', () => {
      it('returns error, by default', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
          },
        });
        const response2 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
          },
        });

        expect(response1.status).to.be(200);
        expect(response2.status).to.be(400);
      });

      it('succeeds, override flag is set', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
          index_pattern: {
            title,
            timeFieldName: 'foo',
          },
        });
        const response2 = await supertest.post('/api/index_patterns/index_pattern').send({
          override: true,
          index_pattern: {
            title,
            timeFieldName: 'bar',
          },
        });

        expect(response1.status).to.be(200);
        expect(response2.status).to.be(200);

        expect(response1.body.index_pattern.timeFieldName).to.be('foo');
        expect(response2.body.index_pattern.timeFieldName).to.be('bar');

        expect(response1.body.index_pattern.id).to.be(response1.body.index_pattern.id);
      });
    });
  });
}
