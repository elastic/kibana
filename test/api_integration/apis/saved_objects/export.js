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
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');

  describe('export', () => {
    describe('with kibana index', () => {
      describe('basic amount of saved objects', () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it('should return objects in dependency order', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              type: ['index-pattern', 'search', 'visualization', 'dashboard'],
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.have.length(4);
              expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
              expect(objects[0]).to.have.property('type', 'index-pattern');
              expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
              expect(objects[1]).to.have.property('type', 'visualization');
              expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
              expect(objects[2]).to.have.property('type', 'dashboard');
              expect(objects[3]).to.have.property('exportedCount', 3);
              expect(objects[3]).to.have.property('missingRefCount', 0);
              expect(objects[3].missingReferences).to.have.length(0);
            });
        });

        it('should exclude the export details if asked', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              type: ['index-pattern', 'search', 'visualization', 'dashboard'],
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.have.length(3);
              expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
              expect(objects[0]).to.have.property('type', 'index-pattern');
              expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
              expect(objects[1]).to.have.property('type', 'visualization');
              expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
              expect(objects[2]).to.have.property('type', 'dashboard');
            });
        });

        it('should support including dependencies when exporting selected objects', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              includeReferencesDeep: true,
              objects: [
                {
                  type: 'dashboard',
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                },
              ],
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.have.length(4);
              expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
              expect(objects[0]).to.have.property('type', 'index-pattern');
              expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
              expect(objects[1]).to.have.property('type', 'visualization');
              expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
              expect(objects[2]).to.have.property('type', 'dashboard');
              expect(objects[3]).to.have.property('exportedCount', 3);
              expect(objects[3]).to.have.property('missingRefCount', 0);
              expect(objects[3].missingReferences).to.have.length(0);
            });
        });

        it('should support including dependencies when exporting by type', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              includeReferencesDeep: true,
              type: ['dashboard'],
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.have.length(4);
              expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
              expect(objects[0]).to.have.property('type', 'index-pattern');
              expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
              expect(objects[1]).to.have.property('type', 'visualization');
              expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
              expect(objects[2]).to.have.property('type', 'dashboard');
              expect(objects[3]).to.have.property('exportedCount', 3);
              expect(objects[3]).to.have.property('missingRefCount', 0);
              expect(objects[3].missingReferences).to.have.length(0);
            });
        });

        it('should support including dependencies when exporting by type and search', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              includeReferencesDeep: true,
              type: ['dashboard'],
              search: 'Requests*',
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.have.length(4);
              expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
              expect(objects[0]).to.have.property('type', 'index-pattern');
              expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
              expect(objects[1]).to.have.property('type', 'visualization');
              expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
              expect(objects[2]).to.have.property('type', 'dashboard');
              expect(objects[3]).to.have.property('exportedCount', 3);
              expect(objects[3]).to.have.property('missingRefCount', 0);
              expect(objects[3].missingReferences).to.have.length(0);
            });
        });

        it(`should throw error when object doesn't exist`, async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              objects: [
                {
                  type: 'dashboard',
                  id: '1',
                },
              ],
            })
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Bad Request',
                attributes: {
                  objects: [
                    {
                      id: '1',
                      type: 'dashboard',
                      error: {
                        error: 'Not Found',
                        message: 'Saved object [dashboard/1] not found',
                        statusCode: 404,
                      },
                    },
                  ],
                },
              });
            });
        });

        it(`should return 400 when exporting unsupported type`, async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              type: ['wigwags'],
            })
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Trying to export non-exportable type(s): wigwags',
              });
            });
        });

        it(`should return 400 when exporting objects with unsupported type`, async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              objects: [
                {
                  type: 'wigwags',
                  id: '1',
                },
              ],
            })
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Trying to export object(s) with non-exportable types: wigwags:1',
              });
            });
        });
      });

      describe('10,000 objects', () => {
        before(() => esArchiver.load('saved_objects/10k'));
        after(() => esArchiver.unload('saved_objects/10k'));

        it('should return 400 when exporting without type or objects passed in', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body]: expected a plain object value, but found [null] instead.',
              });
            });
        });

        it('should return 200 when exporting by single type', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              type: 'dashboard',
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              expect(resp.headers['content-disposition']).to.eql(
                'attachment; filename="export.ndjson"'
              );
              expect(resp.headers['content-type']).to.eql('application/ndjson');
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.eql([
                {
                  attributes: {
                    description: '',
                    hits: 0,
                    kibanaSavedObjectMeta: {
                      searchSourceJSON:
                        objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
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
                    version: 1,
                  },
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                  migrationVersion: objects[0].migrationVersion,
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
                },
              ]);
              expect(objects[0].migrationVersion).to.be.ok();
              expect(() =>
                JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
              ).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.optionsJSON)).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.panelsJSON)).not.to.throwError();
            });
        });

        it('should return 200 when exporting by array type', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              type: ['dashboard'],
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              expect(resp.headers['content-disposition']).to.eql(
                'attachment; filename="export.ndjson"'
              );
              expect(resp.headers['content-type']).to.eql('application/ndjson');
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.eql([
                {
                  attributes: {
                    description: '',
                    hits: 0,
                    kibanaSavedObjectMeta: {
                      searchSourceJSON:
                        objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
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
                    version: 1,
                  },
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                  migrationVersion: objects[0].migrationVersion,
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
                },
              ]);
              expect(objects[0].migrationVersion).to.be.ok();
              expect(() =>
                JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
              ).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.optionsJSON)).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.panelsJSON)).not.to.throwError();
            });
        });

        it('should return 200 when exporting by objects', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              objects: [
                {
                  type: 'dashboard',
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                },
              ],
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              expect(resp.headers['content-disposition']).to.eql(
                'attachment; filename="export.ndjson"'
              );
              expect(resp.headers['content-type']).to.eql('application/ndjson');
              const objects = resp.text.split('\n').map(JSON.parse);
              expect(objects).to.eql([
                {
                  attributes: {
                    description: '',
                    hits: 0,
                    kibanaSavedObjectMeta: {
                      searchSourceJSON:
                        objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
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
                    version: 1,
                  },
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                  migrationVersion: objects[0].migrationVersion,
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
                },
              ]);
              expect(objects[0].migrationVersion).to.be.ok();
              expect(() =>
                JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
              ).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.optionsJSON)).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.panelsJSON)).not.to.throwError();
            });
        });

        it('should return 400 when exporting by type and objects', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              type: 'dashboard',
              objects: [
                {
                  type: 'dashboard',
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                },
              ],
              excludeExportDetails: true,
            })
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: `Can't specify both "types" and "objects" properties when exporting`,
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
          await supertest.delete(`/api/saved_objects/visualization/${customVisId}`).expect(200);
          await esArchiver.unload('saved_objects/10k');
        });

        it('should return 400 when exporting more than 10,000', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .send({
              type: ['dashboard', 'visualization', 'search', 'index-pattern'],
              excludeExportDetails: true,
            })
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: `Can't export more than 10000 objects`,
              });
            });
        });
      });
    });

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await es.indices.delete({
            index: '.kibana',
            ignore: [404],
          })
      );

      it('should return empty response', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .send({
            type: ['index-pattern', 'search', 'visualization', 'dashboard'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            expect(resp.text).to.eql('');
          });
      });
    });
  });
}
