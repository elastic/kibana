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
import { EsArchiver } from 'src/es_archiver';

import { SuperTest, Response } from 'supertest';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: { getService: <T>(name: string) => T }) {
  const esArchiver = getService<EsArchiver>('esArchiver');
  const supertest = getService<SuperTest<any>>('supertest');

  describe('Search API', () => {
    before(() => esArchiver.load('search/count'));
    after(() => esArchiver.unload('search/count'));

    it('should return 200 with hits when searching for an existing index', async () => {
      await supertest
        .post('/api/search')
        .send({
          index: 'foo*',
        })
        .expect(200)
        .then((response: Response) => {
          expect(response.body !== undefined).to.be(true);
          expect(response.body.hits.total.value).to.be(2);
        });
    });

    it('should return 200 with 0 when searching for a non existent index by default', async () => {
      await supertest
        .post('/api/search')
        .send({
          index: 'idontexist',
        })
        .expect(200)
        .then((response: Response) => {
          expect(response.body !== undefined).to.be(true);
          expect(response.body.hits.total.value).to.be(0);
        });
    });

    /**
     * This tests that a caller can use custom elasticsearch query parameters without us explicitly
     * supporting them.
     */
    it('should return 500 when searching for a non existent index when ignoreUnavailable is given', async () => {
      await supertest
        .post('/api/search')
        .send({
          index: 'idontexist',
          ignoreUnavailable: false,
        })
        .expect(500);
    });
  });
}
