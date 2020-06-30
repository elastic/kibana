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

  describe('Script Languages API', function getLanguages() {
    it('should return 200 with an array of languages', () =>
      supertest
        .get('/api/kibana/scripts/languages')
        .expect(200)
        .then((response) => {
          expect(response.body).to.be.an('array');
        }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should only return langs enabled for inline scripting', () =>
      supertest
        .get('/api/kibana/scripts/languages')
        .expect(200)
        .then((response) => {
          expect(response.body).to.contain('expression');
          expect(response.body).to.contain('painless');
          expect(response.body).to.not.contain('groovy');
        }));
  });
}
