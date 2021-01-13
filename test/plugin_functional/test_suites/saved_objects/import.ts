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

import { join } from 'path';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  const importFile = (fileName: string) =>
    supertest
      .post('/api/saved_objects/_import?overwrite=true')
      .set('Content-Type', 'multipart/form-data')
      .set('kbn-xsrf', 'true')
      .attach('file', join(__dirname, 'exports', fileName))
      .expect(200);

  describe('POST /api/saved_objects/_import', () => {
    describe('import warnings', () => {
      it('returns correct warnings for test_import_warning_1', async () => {
        const response = await importFile('_import_type_1.ndjson');

        expect(response.body.success).to.eql(true);
        expect(response.body.warnings).to.eql([
          { type: 'simple', message: 'warning for test_import_warning_1' },
        ]);
      });

      it('returns correct warnings for test_import_warning_2', async () => {
        const response = await importFile('_import_type_2.ndjson');

        expect(response.body.success).to.eql(true);
        expect(response.body.warnings).to.eql([
          {
            type: 'action_required',
            message: 'warning for test_import_warning_2',
            actionUrl: '/some/url',
          },
        ]);
      });

      it('returns correct warnings when importing multiple types with warnings', async () => {
        const response = await importFile('_import_both_types.ndjson');

        expect(response.body.success).to.eql(true);
        expect(response.body.warnings).to.eql([
          { type: 'simple', message: 'warning for test_import_warning_1' },
          {
            type: 'action_required',
            message: 'warning for test_import_warning_2',
            actionUrl: '/some/url',
          },
        ]);
      });
    });
  });
}
