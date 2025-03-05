/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { Response } from 'supertest';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('find', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await kibanaServer.version.get();
      expect(typeof KIBANA_VERSION).to.eql('string');
      expect(KIBANA_VERSION.length).to.be.greaterThan(0);
    });

    describe('with kibana index', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });

      it('should return 200 with individual responses', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=visualization')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects.map((so: { id: string }) => so.id)).to.eql([
              'dd7caf20-9efd-11e7-acb3-3dab96693fab',
            ]);
          }));

      describe('unknown type', () => {
        it('should return 200 with empty response', async () =>
          await supertest
            .get('/api/kibana/management/saved_objects/_find?type=wigwags')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(400)
            .then((resp: Response) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request query.searchFields]: definition for this key is missing',
              });
            }));
      });

      describe('`hasReference` and `hasReferenceOperator` parameters', () => {
        before(async () => {
          await kibanaServer.importExport.load(
            'test/api_integration/fixtures/kbn_archiver/saved_objects/references.json'
          );
        });
        after(async () => {
          await kibanaServer.importExport.unload(
            'test/api_integration/fixtures/kbn_archiver/saved_objects/references.json'
          );
        });

        it('search for a reference', async () => {
          await supertest
            .get('/api/kibana/management/saved_objects/_find')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .query({
              type: 'visualization',
              hasReference: JSON.stringify({ type: 'ref-type', id: 'ref-1' }),
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects.map((obj: any) => obj.id)).to.eql(['only-ref-1', 'ref-1-and-ref-2']);
            });
        });

        it('search for multiple references with OR operator', async () => {
          await supertest
            .get('/api/kibana/management/saved_objects/_find')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .query({
              type: 'visualization',
              hasReference: JSON.stringify([
                { type: 'ref-type', id: 'ref-1' },
                { type: 'ref-type', id: 'ref-2' },
              ]),
              hasReferenceOperator: 'OR',
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects.map((obj: any) => obj.id)).to.eql([
                'only-ref-1',
                'only-ref-2',
                'ref-1-and-ref-2',
              ]);
            });
        });

        it('search for multiple references with AND operator', async () => {
          await supertest
            .get('/api/kibana/management/saved_objects/_find')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .query({
              type: 'visualization',
              hasReference: JSON.stringify([
                { type: 'ref-type', id: 'ref-1' },
                { type: 'ref-type', id: 'ref-2' },
              ]),
              hasReferenceOperator: 'AND',
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects.map((obj: any) => obj.id)).to.eql(['ref-1-and-ref-2']);
            });
        });
      });

      describe('`sortField` and `sortOrder` parameters', () => {
        it('sort objects by "type" in "asc" order', async () => {
          await supertest
            .get('/api/kibana/management/saved_objects/_find')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .query({
              type: ['visualization', 'dashboard'],
              sortField: 'type',
              sortOrder: 'asc',
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects.length).be.greaterThan(1); // Need more than 1 result for our test
              expect(objects[0].type).to.be('dashboard');
            });
        });

        it('sort objects by "type" in "desc" order', async () => {
          await supertest
            .get('/api/kibana/management/saved_objects/_find')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .query({
              type: ['visualization', 'dashboard'],
              sortField: 'type',
              sortOrder: 'desc',
            })
            .expect(200)
            .then((resp) => {
              const objects = resp.body.saved_objects;
              expect(objects[0].type).to.be('visualization');
            });
        });
      });
    });

    describe('meta attributes injected properly', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/search.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/search.json'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should inject meta attributes for searches', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=search')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(1);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'discoverApp',
              title: 'OneRecord',
              hiddenType: false,
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover_v2.show',
              },
              namespaceType: 'multiple-isolated',
            });
          }));

      it('should inject meta attributes for dashboards', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=dashboard')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(1);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'dashboardApp',
              title: 'Dashboard',
              hiddenType: false,
              inAppUrl: {
                path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'dashboard_v2.show',
              },
              namespaceType: 'multiple-isolated',
            });
          }));

      it('should inject meta attributes for visualizations', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=visualization')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(2);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              hiddenType: false,
              inAppUrl: {
                path: '/app/visualize#/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize_v2.show',
              },
              namespaceType: 'multiple-isolated',
            });
            expect(resp.body.saved_objects[1].meta).to.eql({
              icon: 'visualizeApp',
              title: 'Visualization',
              hiddenType: false,
              inAppUrl: {
                path: '/app/visualize#/edit/add810b0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize_v2.show',
              },
              namespaceType: 'multiple-isolated',
            });
          }));

      it('should inject meta attributes for index patterns', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=index-pattern')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(1);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'indexPatternApp',
              title: 'saved_objects*',
              hiddenType: false,
              editUrl: '/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
              namespaceType: 'multiple',
            });
          }));
    });
  });
}
