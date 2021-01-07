/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  });
}
