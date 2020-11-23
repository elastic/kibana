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
        it('should return 200 with individual responses from the all namespaces', async () =>
          await supertest
            .get('/api/saved_objects/_find?type=visualization&fields=title&namespaces=*')
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                page: 1,
                per_page: 20,
                total: 2,
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
                  {
                    attributes: {
                      title: 'Count of requests',
                    },
                    id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                    migrationVersion: {
                      visualization: '7.10.0',
                    },
                    namespaces: ['foo-ns'],
                    references: [
                      {
                        id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                        type: 'index-pattern',
                      },
                    ],
                    score: 0,
                    type: 'visualization',
                    updated_at: '2017-09-21T18:51:23.794Z',
                    version: 'WzYsMV0=',
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

      describe('with a aggs', () => {
        it('should return 200 with a valid response', async () =>
          await supertest
            .get(
              `/api/saved_objects/_find?type=visualization&per_page=0&aggs=${encodeURIComponent(
                JSON.stringify({
                  type_count: { max: { field: 'visualization.attributes.version' } },
                })
              )}`
            )
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                aggregations: {
                  type_count: {
                    value: 1,
                  },
                },
                page: 1,
                per_page: 0,
                saved_objects: [],
                total: 1,
              });
            }));

        it('wrong type should return 400 with Bad Request', async () =>
          await supertest
            .get(
              `/api/saved_objects/_find?type=visualization&per_page=0&aggs=${encodeURIComponent(
                JSON.stringify({
                  type_count: { max: { field: 'dashboard.attributes.version' } },
                })
              )}`
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

        it('adding a wrong attributes should return 400 with Bad Request', async () =>
          await supertest
            .get(
              `/api/saved_objects/_find?type=visualization&per_page=0&aggs=${encodeURIComponent(
                JSON.stringify({
                  type_count: {
                    max: {
                      field: 'visualization.attributes.version',
                      script: 'Oh yes I am going to a script',
                    },
                  },
                })
              )}`
            )
            .expect(400)
            .then((resp) => {
              console.log('body', JSON.stringify(resp.body));
              expect(resp.body).to.eql({
                error: 'Bad Request',
                message:
                  'script attribute is not supported in saved objects aggregation: Bad Request',
                statusCode: 400,
              });
            }));
      });

      describe('`has_reference` and `has_reference_operator` parameters', () => {
        before(() => esArchiver.load('saved_objects/references'));
        after(() => esArchiver.unload('saved_objects/references'));

        it('search for a reference', async () => {
          await supertest
            .get('/api/saved_objects/_find')
            .query({
              type: 'visualization',
              has_reference: JSON.stringify({ type: 'ref-type', id: 'ref-1' }),
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects.map((obj) => obj.id)).to.eql(['only-ref-1', 'ref-1-and-ref-2']);
            });
        });

        it('search for multiple references with OR operator', async () => {
          await supertest
            .get('/api/saved_objects/_find')
            .query({
              type: 'visualization',
              has_reference: JSON.stringify([
                { type: 'ref-type', id: 'ref-1' },
                { type: 'ref-type', id: 'ref-2' },
              ]),
              has_reference_operator: 'OR',
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects.map((obj) => obj.id)).to.eql([
                'only-ref-1',
                'ref-1-and-ref-2',
                'only-ref-2',
              ]);
            });
        });

        it('search for multiple references with AND operator', async () => {
          await supertest
            .get('/api/saved_objects/_find')
            .query({
              type: 'visualization',
              has_reference: JSON.stringify([
                { type: 'ref-type', id: 'ref-1' },
                { type: 'ref-type', id: 'ref-2' },
              ]),
              has_reference_operator: 'AND',
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects.map((obj) => obj.id)).to.eql(['ref-1-and-ref-2']);
            });
        });
      });
    });

    describe('searching for special characters', () => {
      before(() => esArchiver.load('saved_objects/find_edgecases'));
      after(() => esArchiver.unload('saved_objects/find_edgecases'));

      it('can search for objects with dashes', async () =>
        await supertest
          .get('/api/saved_objects/_find')
          .query({
            type: 'visualization',
            search_fields: 'title',
            search: 'my-vis*',
          })
          .expect(200)
          .then((resp) => {
            const savedObjects = resp.body.saved_objects;
            expect(savedObjects.map((so) => so.attributes.title)).to.eql(['my-visualization']);
          }));

      it('can search with the prefix search character just after a special one', async () =>
        await supertest
          .get('/api/saved_objects/_find')
          .query({
            type: 'visualization',
            search_fields: 'title',
            search: 'my-*',
          })
          .expect(200)
          .then((resp) => {
            const savedObjects = resp.body.saved_objects;
            expect(savedObjects.map((so) => so.attributes.title)).to.eql(['my-visualization']);
          }));

      it('can search for objects with asterisk', async () =>
        await supertest
          .get('/api/saved_objects/_find')
          .query({
            type: 'visualization',
            search_fields: 'title',
            search: 'some*vi*',
          })
          .expect(200)
          .then((resp) => {
            const savedObjects = resp.body.saved_objects;
            expect(savedObjects.map((so) => so.attributes.title)).to.eql(['some*visualization']);
          }));

      it('can still search tokens by prefix', async () =>
        await supertest
          .get('/api/saved_objects/_find')
          .query({
            type: 'visualization',
            search_fields: 'title',
            search: 'visuali*',
          })
          .expect(200)
          .then((resp) => {
            const savedObjects = resp.body.saved_objects;
            expect(savedObjects.map((so) => so.attributes.title)).to.eql([
              'my-visualization',
              'some*visualization',
            ]);
          }));
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
