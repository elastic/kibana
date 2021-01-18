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
import type { SavedObject } from '../../../../src/core/types';
import { PluginFunctionalProviderContext } from '../../services';

function parseNdJson(input: string): Array<SavedObject<any>> {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('export transforms', () => {
    before(async () => {
      await esArchiver.load(
        '../functional/fixtures/es_archiver/saved_objects_management/export_transform'
      );
    });

    after(async () => {
      await esArchiver.unload(
        '../functional/fixtures/es_archiver/saved_objects_management/export_transform'
      );
    });

    it('allows to mutate the objects during an export', async () => {
      await supertest
        .post('/api/saved_objects/_export')
        .set('kbn-xsrf', 'true')
        .send({
          type: ['test-export-transform'],
          excludeExportDetails: true,
        })
        .expect(200)
        .then((resp) => {
          const objects = parseNdJson(resp.text);
          expect(objects.map((obj) => ({ id: obj.id, enabled: obj.attributes.enabled }))).to.eql([
            {
              id: 'type_1-obj_1',
              enabled: false,
            },
            {
              id: 'type_1-obj_2',
              enabled: false,
            },
          ]);
        });
    });

    it('allows to add additional objects to an export', async () => {
      await supertest
        .post('/api/saved_objects/_export')
        .set('kbn-xsrf', 'true')
        .send({
          objects: [
            {
              type: 'test-export-add',
              id: 'type_2-obj_1',
            },
          ],
          excludeExportDetails: true,
        })
        .expect(200)
        .then((resp) => {
          const objects = parseNdJson(resp.text);
          expect(objects.map((obj) => obj.id)).to.eql(['type_2-obj_1', 'type_dep-obj_1']);
        });
    });

    it('allows to add additional objects to an export when exporting by type', async () => {
      await supertest
        .post('/api/saved_objects/_export')
        .set('kbn-xsrf', 'true')
        .send({
          type: ['test-export-add'],
          excludeExportDetails: true,
        })
        .expect(200)
        .then((resp) => {
          const objects = parseNdJson(resp.text);
          expect(objects.map((obj) => obj.id)).to.eql([
            'type_2-obj_1',
            'type_2-obj_2',
            'type_dep-obj_1',
            'type_dep-obj_2',
          ]);
        });
    });
  });
}
