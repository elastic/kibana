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
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('export_objects', () => {
    describe('with kibana index', () => {
      describe('basic amount of saved objects', () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it('should return objects in dependency order', async () => {
          await supertest
            .post('/api/saved_objects/_export_objects')
            .send({
              objects: [
                {
                  type: 'dashboard',
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                },
                {
                  type: 'visualization',
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                },
                {
                  type: 'index-pattern',
                  id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                }
              ],
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

        it('should validate types', async () => {
          await supertest
            .post('/api/saved_objects/_export_objects')
            .send({
              objects: [
                {
                  type: 'foo',
                  id: '1',
                },
              ],
            })
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                // eslint-disable-next-line max-len
                message: 'child "objects" fails because ["objects" at position 0 fails because [child "type" fails because ["type" must be one of [index-pattern, search, visualization, dashboard]]]]',
                validation: { source: 'payload', keys: [ 'objects.0.type' ] },
              });
            });
        });

        it(`should throw error when object doesn't exist`, async () => {
          await supertest
            .post('/api/saved_objects/_export_objects')
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
                        statusCode: 404,
                        message: 'Not found',
                      },
                    },
                  ],
                },
              });
            });
        });
      });

      describe('10,000 objects', () => {
        before(() => esArchiver.load('saved_objects/10k'));
        after(() => esArchiver.unload('saved_objects/10k'));

        it('should return 400 when exporting without objects passed in', async () => {
          await supertest
            .post('/api/saved_objects/_export_objects')
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '"value" must be an object',
                validation: { source: 'payload', keys: [ 'value' ] },
              });
            });
        });

        it('should return 200 when exporting', async () => {
          await supertest
            .post('/api/saved_objects/_export_objects')
            .send({
              objects: [
                {
                  type: 'dashboard',
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                },
              ],
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
              expect(() => JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.optionsJSON)).not.to.throwError();
              expect(() => JSON.parse(objects[0].attributes.panelsJSON)).not.to.throwError();
            });
        });
      });

      describe('10,001 objects', () => {
        it('should return 400 when requesting more than 10,000', async () => {
          const objects = [];
          for (let i = 0; i < 10001; i++) {
            objects.push({
              type: 'visualization',
              id: i.toString(),
            });
          }
          await supertest
            .post('/api/saved_objects/_export_objects')
            .send({
              objects,
            })
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'child "objects" fails because ["objects" must contain less than or equal to 10000 items]',
                validation: {
                  keys: [
                    'objects',
                  ],
                  source: 'payload',
                },
              });
            });
        });
      });
    });

    describe('without kibana index', () => {
      before(async () => (
        // just in case the kibana server has recreated it
        await es.indices.delete({
          index: '.kibana',
          ignore: [404],
        })
      ));

      it('should return empty response', async () => {
        await supertest
          .post('/api/saved_objects/_export_objects')
          .send({
            objects: [],
          })
          .expect(200)
          .then((resp) => {
            expect(resp.text).to.eql('');
          });
      });
    });
  });
}
