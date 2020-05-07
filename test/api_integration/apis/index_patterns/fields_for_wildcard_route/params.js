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

export default function({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const randomness = getService('randomness');

  describe('params', () => {
    before(() => esArchiver.load('index_patterns/basic_index'));
    after(() => esArchiver.unload('index_patterns/basic_index'));

    it('requires a pattern query param', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({})
        .expect(400));

    it('accepts a JSON formatted meta_fields query param', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: JSON.stringify(['meta']),
        })
        .expect(200));

    it('accepts meta_fields query param in string array', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: ['_id', 'meta'],
        })
        .expect(200));

    it('rejects a comma-separated list of meta_fields', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: '*',
          meta_fields: 'foo,bar',
        })
        .expect(400));

    it('rejects unexpected query params', () =>
      supertest
        .get('/api/index_patterns/_fields_for_wildcard')
        .query({
          pattern: randomness.word(),
          [randomness.word()]: randomness.word(),
        })
        .expect(400));
  });
}
