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
import { Response } from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('find', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 with individual responses', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=visualization&fields=title')
          .expect(200)
          .then((resp: Response) => {
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
                  references: [
                    {
                      id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                      type: 'index-pattern',
                    },
                  ],
                  score: 0,
                  updated_at: '2017-09-21T18:51:23.794Z',
                  meta: {
                    editUrl:
                      '/management/kibana/objects/savedVisualizations/dd7caf20-9efd-11e7-acb3-3dab96693fab',
                    icon: 'visualizeApp',
                    inAppUrl: {
                      path: '/app/visualize#/edit/dd7caf20-9efd-11e7-acb3-3dab96693fab',
                      uiCapabilitiesPath: 'visualize.show',
                    },
                    title: 'Count of requests',
                    namespaceType: 'single',
                  },
                },
              ],
            });
          }));

      describe('unknown type', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/kibana/management/saved_objects/_find?type=wigwags')
            .expect(200)
            .then((resp: Response) => {
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
            .get(
              '/api/kibana/management/saved_objects/_find?type=visualization&page=100&perPage=100'
            )
            .expect(200)
            .then((resp: Response) => {
              expect(resp.body).to.eql({
                page: 100,
                per_page: 100,
                total: 1,
                saved_objects: [],
              });
            }));
      });

      describe('unknown search field', () => {
        it('should return 400 when using searchFields', async () =>
          await supertest
            .get('/api/kibana/management/saved_objects/_find?type=url&searchFields=a')
            .expect(400)
            .then((resp: Response) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request query.searchFields]: definition for this key is missing',
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
          .get('/api/kibana/management/saved_objects/_find?type=visualization')
          .expect(200)
          .then((resp: Response) => {
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
            .get('/api/kibana/management/saved_objects/_find?type=wigwags')
            .expect(200)
            .then((resp: Response) => {
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
            .get('/api/kibana/management/saved_objects/_find')
            .expect(400)
            .then((resp: Response) => {
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
            .get(
              '/api/kibana/management/saved_objects/_find?type=visualization&page=100&perPage=100'
            )
            .expect(200)
            .then((resp: Response) => {
              expect(resp.body).to.eql({
                page: 100,
                per_page: 100,
                total: 0,
                saved_objects: [],
              });
            }));
      });

      describe('unknown search field', () => {
        it('should return 400 when using searchFields', async () =>
          await supertest
            .get('/api/kibana/management/saved_objects/_find?type=url&searchFields=a')
            .expect(400)
            .then((resp: Response) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request query.searchFields]: definition for this key is missing',
              });
            }));
      });
    });

    describe('meta attributes injected properly', () => {
      before(() => esArchiver.load('management/saved_objects/search'));
      after(() => esArchiver.unload('management/saved_objects/search'));

      it('should inject meta attributes for searches', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=search')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(1);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'discoverApp',
              title: 'OneRecord',
              editUrl:
                '/management/kibana/objects/savedSearches/960372e0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
              namespaceType: 'single',
            });
          }));

      it('should inject meta attributes for dashboards', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=dashboard')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(1);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'dashboardApp',
              title: 'Dashboard',
              editUrl:
                '/management/kibana/objects/savedDashboards/b70c7ae0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'dashboard.show',
              },
              namespaceType: 'single',
            });
          }));

      it('should inject meta attributes for visualizations', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=visualization')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(2);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              editUrl:
                '/management/kibana/objects/savedVisualizations/a42c0580-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
              namespaceType: 'single',
            });
            expect(resp.body.saved_objects[1].meta).to.eql({
              icon: 'visualizeApp',
              title: 'Visualization',
              editUrl:
                '/management/kibana/objects/savedVisualizations/add810b0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/add810b0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
              namespaceType: 'single',
            });
          }));

      it('should inject meta attributes for index patterns', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=index-pattern')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(1);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'indexPatternApp',
              title: 'saved_objects*',
              editUrl:
                '/management/kibana/indexPatterns/patterns/8963ca30-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path:
                  '/app/management/kibana/indexPatterns/patterns/8963ca30-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
              namespaceType: 'single',
            });
          }));
    });
  });
}
