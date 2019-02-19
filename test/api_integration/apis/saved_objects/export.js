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
    describe('10,000 objects', () => {
      before(() => esArchiver.load('saved_objects/10k'));
      after(() => esArchiver.unload('saved_objects/10k'));

      it('should return 400 when exporting without type or objects passed in', async () => {
        await supertest
          .get('/api/saved_objects/_export')
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: '"value" must contain at least one of [type, objects]',
              validation: { source: 'query', keys: [ 'value' ] },
            });
          });
      });

      it('should return 200 when exporting by single type', async () => {
        await supertest
          .get('/api/saved_objects/_export')
          .query({
            type: 'dashboard',
          })
          .expect(200)
          .then((resp) => {
            expect(resp.headers['content-disposition']).to.eql('attachment; filename="export.ndjson"');
            expect(resp.headers['content-type']).to.eql('application/ndjson');
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
            JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON);
            JSON.parse(objects[0].attributes.optionsJSON);
            JSON.parse(objects[0].attributes.panelsJSON);
          });
      });

      it('should return 200 when exporting by array type', async () => {
        await supertest
          .get('/api/saved_objects/_export')
          .query({
            type: ['dashboard'],
          })
          .expect(200)
          .then((resp) => {
            expect(resp.headers['content-disposition']).to.eql('attachment; filename="export.ndjson"');
            expect(resp.headers['content-type']).to.eql('application/ndjson');
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
            JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON);
            JSON.parse(objects[0].attributes.optionsJSON);
            JSON.parse(objects[0].attributes.panelsJSON);
          });
      });

      it('should return 200 when exporting by objects', async () => {
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
            expect(resp.headers['content-type']).to.eql('application/ndjson');
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
            JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON);
            JSON.parse(objects[0].attributes.optionsJSON);
            JSON.parse(objects[0].attributes.panelsJSON);
          });
      });

      it('should return 400 when exporting by type and objects', async () => {
        await supertest
          .get('/api/saved_objects/_export')
          .query({
            type: 'dashboard',
            objects: JSON.stringify([
              {
                type: 'dashboard',
                id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              },
            ]),
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: '"value" contains a conflict between exclusive peers [type, objects]',
              validation: { source: 'query', keys: [ 'value' ] },
            });
          });
      });
    });

    describe('10,001 objects', () => {
      let customVisId;
      before(async () => {
        await esArchiver.load('saved_objects/10k');
        await supertest
          .post('/api/saved_objects/visualization')
          .send({
            attributes: {
              title: 'My favorite vis',
            },
          })
          .expect(200)
          .then((resp) => {
            customVisId = resp.body.id;
          });
      });
      after(async () => {
        await supertest
          .delete(`/api/saved_objects/visualization/${customVisId}`)
          .expect(200);
        await esArchiver.unload('saved_objects/10k');
      });

      it('should return 400 when exporting more than 10,000', async () => {
        await supertest
          .get('/api/saved_objects/_export')
          .query({
            type: ['dashboard', 'visualization', 'search', 'index-pattern'],
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `Can't export more than 10000 objects`
            });
          });
      });
    });
  });
}
