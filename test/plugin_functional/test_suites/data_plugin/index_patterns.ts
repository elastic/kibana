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
import '../../plugins/core_provider_plugin/types';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('index patterns', function () {
    let indexPatternId = '';

    it('can create an index pattern', async () => {
      const title = 'shakes*';
      const fieldFormats = { bytes: { id: 'bytes' } };
      const body = await (
        await supertest
          .post('/api/index-patterns-plugin/create')
          .set('kbn-xsrf', 'anything')
          .send({ title, fieldFormats })
          .expect(200)
      ).body;

      indexPatternId = body.id;
      expect(body.id).not.empty();
      expect(body.title).to.equal(title);
      expect(body.fields.length).to.equal(15);
      expect(body.fieldFormatMap).to.eql(fieldFormats);
    });

    it('can get index pattern by id', async () => {
      const body = await (
        await supertest.get(`/api/index-patterns-plugin/get/${indexPatternId}`).expect(200)
      ).body;
      expect(typeof body.id).to.equal('string');
    });

    it('can update index pattern', async () => {
      const resp = await supertest
        .get(`/api/index-patterns-plugin/update/${indexPatternId}`)
        .expect(200);
      expect(resp.body).to.eql({});
    });

    it('can delete index pattern', async () => {
      await supertest.get(`/api/index-patterns-plugin/delete/${indexPatternId}`).expect(200);
    });
  });
}
