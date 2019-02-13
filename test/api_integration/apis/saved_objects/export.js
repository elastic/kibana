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

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('export', () => {
    before(() => esArchiver.load('saved_objects/massive'));
    after(() => esArchiver.unload('saved_objects/massive'));

    it('should return 200 exporting without type or objects passed in', async () => {
      await supertest
        .get('/api/saved_objects/_export')
        .expect(200)
        .then((resp) => {
          expect(resp.headers['content-disposition']).to.eql('attachment; filename="export.ndjson"');
          resp.text.split('\n').map(JSON.parse);
        });
    });

    it('should return 200 exporting by type', async () => {
      await supertest
        .get('/api/saved_objects/_export')
        .query({
          type: ['dashboard'],
        })
        .expect(200)
        .then((resp) => {
          expect(resp.headers['content-disposition']).to.eql('attachment; filename="export.ndjson"');
          const objects = resp.text.split('\n').map(JSON.parse);
          expect(objects).to.eql([{
            attributes: {
              description: '',
              hits: 0,
              kibanaSavedObjectMeta: {
                searchSourceJSON: objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
              },
              optionsJSON: objects[0].attributes.optionsJSON,
              panelsJSON: objects[0].attributes.panelsJSON,
              refreshInterval: {
                display: 'Off',
                pause: false,
                value: 0,
              },
              timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
              timeRestore: true,
              timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
              title: 'Requests',
              uiStateJSON: '{}',
              version: 1,
            },
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            migrationVersion: {
              dashboard: '7.0.0',
            },
            references: [
              {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                name: 'panel_0',
                type: 'visualization',
              },
            ],
            type: 'dashboard',
            updated_at: '2017-09-21T18:57:40.826Z',
            version: objects[0].version,
          }]);
        });
    });

    it('should return 200 exporting by objects', async () => {
      await supertest
        .get('/api/saved_objects/_export')
        .query({
          objects: JSON.stringify([
            {
              type: 'dashboard',
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            },
          ]),
        })
        .expect(200)
        .then((resp) => {
          expect(resp.headers['content-disposition']).to.eql('attachment; filename="export.ndjson"');
          const objects = resp.text.split('\n').map(JSON.parse);
          expect(objects).to.eql([{
            attributes: {
              description: '',
              hits: 0,
              kibanaSavedObjectMeta: {
                searchSourceJSON: objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
              },
              optionsJSON: objects[0].attributes.optionsJSON,
              panelsJSON: objects[0].attributes.panelsJSON,
              refreshInterval: {
                display: 'Off',
                pause: false,
                value: 0,
              },
              timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
              timeRestore: true,
              timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
              title: 'Requests',
              uiStateJSON: '{}',
              version: 1,
            },
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            migrationVersion: {
              dashboard: '7.0.0',
            },
            references: [
              {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                name: 'panel_0',
                type: 'visualization',
              },
            ],
            type: 'dashboard',
            updated_at: '2017-09-21T18:57:40.826Z',
            version: objects[0].version,
          }]);
        });
    });
  });
}
