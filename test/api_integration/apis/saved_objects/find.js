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

  describe('find', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 with individual responses', async () =>
        await supertest
          .get('/api/saved_objects/_find?type=visualization&fields=title')
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              page: 1,
              per_page: 20,
              total: 1,
              saved_objects: [
                {
                  type: 'visualization',
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  version: 'WzIsMV0=',
                  attributes: {
                    title: 'Count of requests',
                  },
                  score: 0,
                  migrationVersion: resp.body.saved_objects[0].migrationVersion,
                  namespaces: ['default'],
                  references: [
                    {
                      id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                      type: 'index-pattern',
                    },
                  ],
                  updated_at: '2017-09-21T18:51:23.794Z',
                },
              ],
            });
            expect(resp.body.saved_objects[0].migrationVersion).to.be.ok();
          }));

      describe('unknown type', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=wigwags')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: [],
              });
            }));
      });

      describe('page beyond total', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=visualization&page=100&per_page=100')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 100,
                per_page: 100,
                total: 1,
                saved_objects: [],
              });
            }));
      });

      describe('unknown search field', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=url&search_fields=a')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: [],
              });
            }));
      });

      describe('unknown namespace', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=visualization&namespaces=foo')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: [],
              });
            }));
      });

      describe('known namespace', () => {
        it('should return 200 with individual responses', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=visualization&fields=title&namespaces=default')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 1,
                saved_objects: [
                  {
                    type: 'visualization',
                    id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                    version: 'WzIsMV0=',
                    attributes: {
                      title: 'Count of requests',
                    },
                    migrationVersion: resp.body.saved_objects[0].migrationVersion,
                    namespaces: ['default'],
                    score: 0,
                    references: [
                      {
                        id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                        type: 'index-pattern',
                      },
                    ],
                    updated_at: '2017-09-21T18:51:23.794Z',
                  },
                ],
              });
              expect(resp.body.saved_objects[0].migrationVersion).to.be.ok();
            }));
      });

      describe('wildcard namespace', () => {
        it('should return 200 with individual responses from the default namespace', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=visualization&fields=title&namespaces=*')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 1,
                saved_objects: [
                  {
                    type: 'visualization',
                    id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                    version: 'WzIsMV0=',
                    attributes: {
                      title: 'Count of requests',
                    },
                    migrationVersion: resp.body.saved_objects[0].migrationVersion,
                    namespaces: ['default'],
                    score: 0,
                    references: [
                      {
                        id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                        type: 'index-pattern',
                      },
                    ],
                    updated_at: '2017-09-21T18:51:23.794Z',
                  },
                ],
              });
              expect(resp.body.saved_objects[0].migrationVersion).to.be.ok();
            }));
      });

      describe('with a filter', () => {
        it('should return 200 with a valid response', async () =>
          await supertest
            .get(
              '/api/saved_objects/_find?type=visualization&filter=visualization.attributes.title:"Count of requests"'
            )
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 1,
                saved_objects: [
                  {
                    type: 'visualization',
                    id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                    attributes: {
                      title: 'Count of requests',
                      visState: resp.body.saved_objects[0].attributes.visState,
                      uiStateJSON: '{"spy":{"mode":{"name":null,"fill":false}}}',
                      description: '',
                      version: 1,
                      kibanaSavedObjectMeta: {
                        searchSourceJSON:
                          resp.body.saved_objects[0].attributes.kibanaSavedObjectMeta
                            .searchSourceJSON,
                      },
                    },
                    namespaces: ['default'],
                    score: 0,
                    references: [
                      {
                        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                        type: 'index-pattern',
                        id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                      },
                    ],
                    migrationVersion: resp.body.saved_objects[0].migrationVersion,
                    updated_at: '2017-09-21T18:51:23.794Z',
                    version: 'WzIsMV0=',
                  },
                ],
              });
            }));

        it('wrong type should return 400 with Bad Request', async () =>
          await supertest
            .get(
              '/api/saved_objects/_find?type=visualization&filter=dashboard.attributes.title:foo'
            )
            .expect(400)
            .then((resp) => {
              console.log('body', JSON.stringify(resp.body));
              expect(resp.body).to.eql({
                error: 'Bad Request',
                message: 'This type dashboard is not allowed: Bad Request',
                statusCode: 400,
              });
            }));

        it('KQL syntax error should return 400 with Bad Request', async () =>
          await supertest
            .get(
              '/api/saved_objects/_find?type=dashboard&filter=dashboard.attributes.title:foo<invalid'
            )
            .expect(400)
            .then((resp) => {
              console.log('body', JSON.stringify(resp.body));
              expect(resp.body).to.eql({
                error: 'Bad Request',
                message:
                  'KQLSyntaxError: Expected AND, OR, end of input, ' +
                  'whitespace but "<" found.\ndashboard.attributes.title:foo' +
                  '<invalid\n------------------------------^: Bad Request',
                statusCode: 400,
              });
            }));
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

      it('should return 200 with empty response', async () =>
        await supertest
          .get('/api/saved_objects/_find?type=visualization')
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              page: 1,
              per_page: 20,
              total: 0,
              saved_objects: [],
            });
          }));

      describe('unknown type', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=wigwags')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: [],
              });
            }));
      });

      describe('missing type', () => {
        it('should return 400', async () =>
          await supertest
            .get('/api/saved_objects/_find')
            .expect(400)
            .then((resp) => {
              expect(resp.body).to.eql({
                error: 'Bad Request',
                message:
                  '[request query.type]: expected at least one defined value but got [undefined]',
                statusCode: 400,
              });
            }));
      });

      describe('page beyond total', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=visualization&page=100&per_page=100')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 100,
                per_page: 100,
                total: 0,
                saved_objects: [],
              });
            }));
      });

      describe('unknown search field', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=url&search_fields=a')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: [],
              });
            }));
      });

      describe('with a filter', () => {
        it('should return 200 with an empty response', async () =>
          await supertest
            .get(
              '/api/saved_objects/_find?type=visualization&filter=visualization.attributes.title:"Count of requests"'
            )
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 0,
                saved_objects: [],
              });
            }));

        it('wrong type should return 400 with Bad Request', async () =>
          await supertest
            .get(
              '/api/saved_objects/_find?type=visualization&filter=dashboard.attributes.title:foo'
            )
            .expect(400)
            .then((resp) => {
              console.log('body', JSON.stringify(resp.body));
              expect(resp.body).to.eql({
                error: 'Bad Request',
                message: 'This type dashboard is not allowed: Bad Request',
                statusCode: 400,
              });
            }));
      });
    });
  });
}
