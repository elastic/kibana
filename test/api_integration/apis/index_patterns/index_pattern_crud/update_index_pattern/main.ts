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

  describe('main', () => {
    it('can update index_pattern title', async () => {
      const title1 = `foo-${Date.now()}-${Math.random()}*`;
      const title2 = `bar-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title: title1,
        },
      });

      expect(response1.body.index_pattern.title).to.be(title1);

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          title: title2,
        },
      });

      expect(response2.body.index_pattern.title).to.be(title2);

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.title).to.be(title2);
    });

    it('can update index_pattern timeFieldName', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          timeFieldName: 'timeFieldName1',
        },
      });

      expect(response1.body.index_pattern.timeFieldName).to.be('timeFieldName1');

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          timeFieldName: 'timeFieldName2',
        },
      });

      expect(response2.body.index_pattern.timeFieldName).to.be('timeFieldName2');

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.timeFieldName).to.be('timeFieldName2');
    });

    it('can update index_pattern intervalName', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });

      expect(response1.body.index_pattern.intervalName).to.be(undefined);

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          intervalName: 'intervalName2',
        },
      });

      expect(response2.body.index_pattern.intervalName).to.be('intervalName2');

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.intervalName).to.be('intervalName2');
    });

    it('can update index_pattern sourceFilters', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          sourceFilters: [
            {
              value: 'foo',
            },
          ],
        },
      });

      expect(response1.body.index_pattern.sourceFilters).to.eql([
        {
          value: 'foo',
        },
      ]);

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          sourceFilters: [
            {
              value: 'bar',
            },
            {
              value: 'baz',
            },
          ],
        },
      });

      expect(response2.body.index_pattern.sourceFilters).to.eql([
        {
          value: 'bar',
        },
        {
          value: 'baz',
        },
      ]);

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.sourceFilters).to.eql([
        {
          value: 'bar',
        },
        {
          value: 'baz',
        },
      ]);
    });

    it('can update index_pattern fieldFormats', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          fieldFormats: {
            foo: {
              id: 'foo',
              params: {
                bar: 'baz',
              },
            },
          },
        },
      });

      expect(response1.body.index_pattern.fieldFormats).to.eql({
        foo: {
          id: 'foo',
          params: {
            bar: 'baz',
          },
        },
      });

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          fieldFormats: {
            a: {
              id: 'a',
              params: {
                b: 'v',
              },
            },
          },
        },
      });

      expect(response2.body.index_pattern.fieldFormats).to.eql({
        a: {
          id: 'a',
          params: {
            b: 'v',
          },
        },
      });

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.fieldFormats).to.eql({
        a: {
          id: 'a',
          params: {
            b: 'v',
          },
        },
      });
    });

    it('can update index_pattern type', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          type: 'foo',
        },
      });

      expect(response1.body.index_pattern.type).to.be('foo');

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          type: 'bar',
        },
      });

      expect(response2.body.index_pattern.type).to.be('bar');

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.type).to.be('bar');
    });

    it('can update index_pattern typeMeta', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          typeMeta: { foo: 'bar' },
        },
      });

      expect(response1.body.index_pattern.typeMeta).to.eql({ foo: 'bar' });

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          typeMeta: { foo: 'baz' },
        },
      });

      expect(response2.body.index_pattern.typeMeta).to.eql({ foo: 'baz' });

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.typeMeta).to.eql({ foo: 'baz' });
    });

    it('can update multiple index pattern fields at once', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          timeFieldName: 'timeFieldName1',
          typeMeta: { foo: 'bar' },
        },
      });

      expect(response1.body.index_pattern.timeFieldName).to.be('timeFieldName1');
      expect(response1.body.index_pattern.intervalName).to.be(undefined);
      expect(response1.body.index_pattern.typeMeta.foo).to.be('bar');

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          timeFieldName: 'timeFieldName2',
          intervalName: 'intervalName2',
          typeMeta: { baz: 'qux' },
        },
      });

      expect(response2.body.index_pattern.timeFieldName).to.be('timeFieldName2');
      expect(response2.body.index_pattern.intervalName).to.be('intervalName2');
      expect(response2.body.index_pattern.typeMeta.baz).to.be('qux');

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.timeFieldName).to.be('timeFieldName2');
      expect(response3.body.index_pattern.intervalName).to.be('intervalName2');
      expect(response3.body.index_pattern.typeMeta.baz).to.be('qux');
    });

    it('can update runtime fields', async () => {
      const title = `basic_index*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
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

      expect(response1.status).to.be(200);
      expect(response1.body.index_pattern.title).to.be(title);

      expect(response1.body.index_pattern.runtimeFieldMap.runtimeFoo.type).to.be('keyword');
      expect(response1.body.index_pattern.runtimeFieldMap.runtimeFoo.script.source).to.be(
        'emit(doc["foo"].value)'
      );

      const id = response1.body.index_pattern.id;
      const response2 = await supertest.post('/api/index_patterns/index_pattern/' + id).send({
        index_pattern: {
          runtimeFieldMap: {
            runtimeBar: {
              type: 'keyword',
              script: {
                source: 'emit(doc["foo"].value)',
              },
            },
          },
        },
      });

      expect(response2.body.index_pattern.runtimeFieldMap.runtimeBar.type).to.be('keyword');
      expect(response2.body.index_pattern.runtimeFieldMap.runtimeFoo).to.be(undefined);

      const response3 = await supertest.get('/api/index_patterns/index_pattern/' + id);

      expect(response3.body.index_pattern.runtimeFieldMap.runtimeBar.type).to.be('keyword');
      expect(response3.body.index_pattern.runtimeFieldMap.runtimeFoo).to.be(undefined);
    });
  });
}
