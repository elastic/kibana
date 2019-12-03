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

  describe('csp smoke test', () => {
    it('app response sends content security policy headers', async () => {
      const response = await supertest.get('/app/kibana');

      expect(response.headers).to.have.property('content-security-policy');
      const header = response.headers['content-security-policy'];
      const parsed = new Map(header.split(';').map(rule => {
        const parts = rule.trim().split(' ');
        const key = parts.splice(0, 1)[0];
        return [key, parts];
      }));

      const entries = Array.from(parsed.entries());
      expect(entries).to.eql([
        [ 'script-src', [ '\'unsafe-eval\'', '\'self\'' ] ],
        [ 'worker-src', [ 'blob:', '\'self\'' ] ],
        [ 'style-src', [ '\'unsafe-inline\'', '\'self\'' ] ]
      ]);
    });
  });
}
