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
import { sortBy } from 'lodash';

export default function({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const ensureFieldsAreSorted = resp => {
    expect(resp.body.fields).to.eql(sortBy(resp.body.fields, 'name'));
  };

  describe('response', () => {
    before(() => esArchiver.load('index_patterns/basic_index'));
    after(() => esArchiver.unload('index_patterns/basic_index'));

    it('returns a flattened version of the fields in es', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'basic_index' })
        .expect(200, {
          fields: [
            {
              type: 'boolean',
              esTypes: ['boolean'],
              searchable: true,
              aggregatable: true,
              name: 'bar',
              readFromDocValues: true,
            },
            {
              type: 'string',
              esTypes: ['text'],
              searchable: true,
              aggregatable: false,
              name: 'baz',
              readFromDocValues: false,
            },
            {
              type: 'string',
              esTypes: ['keyword'],
              searchable: true,
              aggregatable: true,
              name: 'baz.keyword',
              readFromDocValues: true,
              parent: 'baz',
              subType: 'multi',
            },
            {
              type: 'number',
              esTypes: ['long'],
              searchable: true,
              aggregatable: true,
              name: 'foo',
              readFromDocValues: true,
            },
          ],
        })
        .then(ensureFieldsAreSorted));

    it('always returns a field for all passed meta fields', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: 'basic_index',
          meta_fields: JSON.stringify(['_id', '_source', 'crazy_meta_field']),
        })
        .expect(200, {
          fields: [
            {
              aggregatable: true,
              name: '_id',
              esTypes: ['_id'],
              readFromDocValues: false,
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: false,
              name: '_source',
              esTypes: ['_source'],
              readFromDocValues: false,
              searchable: false,
              type: '_source',
            },
            {
              type: 'boolean',
              esTypes: ['boolean'],
              searchable: true,
              aggregatable: true,
              name: 'bar',
              readFromDocValues: true,
            },
            {
              aggregatable: false,
              name: 'baz',
              esTypes: ['text'],
              readFromDocValues: false,
              searchable: true,
              type: 'string',
            },
            {
              type: 'string',
              esTypes: ['keyword'],
              searchable: true,
              aggregatable: true,
              name: 'baz.keyword',
              readFromDocValues: true,
              parent: 'baz',
              subType: 'multi',
            },
            {
              aggregatable: false,
              name: 'crazy_meta_field',
              readFromDocValues: false,
              searchable: false,
              type: 'string',
            },
            {
              type: 'number',
              esTypes: ['long'],
              searchable: true,
              aggregatable: true,
              name: 'foo',
              readFromDocValues: true,
            },
          ],
        })
        .then(ensureFieldsAreSorted));

    it('returns 404 when the pattern does not exist', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '[non-existing-pattern]its-invalid-*',
        })
        .expect(404));
  });
}
