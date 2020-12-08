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

  describe('validation', () => {
    it('returns error when index_pattern object is not provided', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern');

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body]: expected a plain object value, but found [null] instead.'
      );
    });

    it('returns error on empty index_pattern object', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {},
      });

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.index_pattern.title]: expected value of type [string] but got [undefined]'
      );
    });

    it('returns error when "override" parameter is not a boolean', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        override: 123,
        index_pattern: {
          title: 'foo',
        },
      });

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.override]: expected value of type [boolean] but got [number]'
      );
    });

    it('returns error when "refresh_fields" parameter is not a boolean', async () => {
      const response = await supertest.post('/api/index_patterns/index_pattern').send({
        refresh_fields: 123,
        index_pattern: {
          title: 'foo',
        },
      });

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body.refresh_fields]: expected value of type [boolean] but got [number]'
      );
    });
  });
}
