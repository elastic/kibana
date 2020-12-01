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
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('translations', () => {
    it(`returns the translations with the correct headers`, async () => {
      await supertest.get('/translations/en.json').then((response) => {
        expect(response.body.locale).to.eql('en');

        expect(response.header).to.have.property('content-type', 'application/json; charset=utf-8');
        expect(response.header).to.have.property('cache-control', 'must-revalidate');
        expect(response.header).to.have.property('etag');
      });
    });

    it(`returns a 404 when not using the correct locale`, async () => {
      await supertest.get('/translations/foo.json').then((response) => {
        expect(response.status).to.eql(404);
      });
    });
  });
}
