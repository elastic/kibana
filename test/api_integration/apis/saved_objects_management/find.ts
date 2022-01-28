/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { Response } from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
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
          .get('/api/kibana/management/saved_objects/_find?type=visualization&fields=title')
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
    });

    describe('meta attributes injected properly', () => {
      before(() =>
        esArchiver.load('test/api_integration/fixtures/es_archiver/management/saved_objects/search')
      );
      after(() =>
        esArchiver.unload(
          'test/api_integration/fixtures/es_archiver/management/saved_objects/search'
        )
      );

      it('should inject meta attributes for searches', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=search')
          .expect(200)
          .then((resp: Response) => {
            expect(resp.body.saved_objects).to.have.length(1);
            expect(resp.body.saved_objects[0].meta).to.eql({
              icon: 'discoverApp',
              title: 'OneRecord',
              hiddenType: false,
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
              namespaceType: 'multiple-isolated',
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
              hiddenType: false,
              inAppUrl: {
                path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'dashboard.show',
              },
              namespaceType: 'multiple-isolated',
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
              hiddenType: false,
              inAppUrl: {
                path: '/app/visualize#/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
              namespaceType: 'multiple-isolated',
            });
            expect(resp.body.saved_objects[1].meta).to.eql({
              icon: 'visualizeApp',
              title: 'Visualization',
              hiddenType: false,
              inAppUrl: {
                path: '/app/visualize#/edit/add810b0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
              namespaceType: 'multiple-isolated',
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
