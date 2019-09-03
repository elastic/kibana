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

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('query params', () => {
    before(() => esArchiver.load('index_patterns/daily_index'));
    after(() => esArchiver.unload('index_patterns/daily_index'));

    it('requires `pattern` and `look_back` query params', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({ pattern: null })
        .expect(400)
        .then(resp => {
          expect(resp.body.validation).to.eql({
            keys: [
              'pattern',
              'look_back'
            ],
            source: 'query'
          });
        })
    ));

    it('supports `meta_fields` query param', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 1,
          meta_fields: JSON.stringify(['a'])
        })
        .expect(200)
    ));

    it('requires `look_back` to be a number', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 'foo',
        })
        .expect(400)
        .then(resp => {
          expect(resp.body.message).to.contain('"look_back" must be a number');
        })
    ));

    it('requires `look_back` to be greater than one', () => (
      supertest
        .get('/api/index_patterns/_fields_for_time_pattern')
        .query({
          pattern: '[logs-]YYYY.MM.DD',
          look_back: 0,
        })
        .expect(400)
        .then(resp => {
          expect(resp.body.message).to.contain('"look_back" must be larger than or equal to 1');
        })
    ));
  });
}
