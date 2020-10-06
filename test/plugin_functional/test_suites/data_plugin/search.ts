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
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('data.search', () => {
    describe('searchSource', () => {
      const searchSourceFields = {
        highlightAll: true,
        index: '',
        query: {
          language: 'kuery',
          query: 'play_name:\\"Henry IV\\"',
        },
        version: true,
      };

      it('asScoped()', async () => {
        await supertest.get('/api/data_search_plugin/search_source/as_scoped').expect(200);
      });

      it('createEmpty()', async () => {
        await supertest
          .get('/api/data_search_plugin/search_source/create_empty')
          .expect(200)
          .expect(JSON.stringify({ searchSourceJSON: '{}', references: [] }));
      });

      it('create()', async () => {
        await supertest
          .post('/api/data_search_plugin/search_source/create')
          .set('kbn-xsrf', 'anything')
          .send(searchSourceFields)
          .expect(200)
          .expect(({ body }) => {
            const searchSourceJSON = JSON.parse(body.searchSourceJSON);
            expect(Object.keys(body)).to.eql(['searchSourceJSON', 'references']);
            expect(searchSourceJSON.query).to.eql(searchSourceFields.query);
            expect(body.references[0].type).to.equal('index-pattern');
            expect(searchSourceJSON.indexRefName).to.equal(body.references[0].name);
          });
      });
    });
  });
}
