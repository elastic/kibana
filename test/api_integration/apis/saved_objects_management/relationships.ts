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
import { schema } from '@kbn/config-schema';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const responseSchema = schema.arrayOf(
    schema.object({
      id: schema.string(),
      type: schema.string(),
      relationship: schema.oneOf([schema.literal('parent'), schema.literal('child')]),
      meta: schema.object({
        title: schema.string(),
        icon: schema.string(),
        editUrl: schema.string(),
        inAppUrl: schema.object({
          path: schema.string(),
          uiCapabilitiesPath: schema.string(),
        }),
      }),
    })
  );

  describe('relationships', () => {
    before(async () => {
      await esArchiver.load('management/saved_objects/relationships');
    });
    after(async () => {
      await esArchiver.unload('management/saved_objects/relationships');
    });

    const baseApiUrl = `/api/kibana/management/saved_objects/relationships`;
    const defaultTypes = ['visualization', 'index-pattern', 'search', 'dashboard'];

    const relationshipsUrl = (type: string, id: string, types: string[] = defaultTypes) => {
      const typesQuery = types.map((t) => `savedObjectTypes=${t}`).join('&');
      return `${baseApiUrl}/${type}/${id}?${typesQuery}`;
    };

    describe('searches', () => {
      it('should validate search response schema', async () => {
        const resp = await supertest
          .get(relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });

      it('should work for searches', async () => {
        const resp = await supertest
          .get(relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: '8963ca30-3224-11e8-a572-ffca06da1357',
            type: 'index-pattern',
            relationship: 'child',
            meta: {
              title: 'saved_objects*',
              icon: 'indexPatternApp',
              editUrl:
                '/management/kibana/indexPatterns/patterns/8963ca30-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path:
                  '/app/management/kibana/indexPatterns/patterns/8963ca30-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
            },
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'parent',
            meta: {
              title: 'VisualizationFromSavedSearch',
              icon: 'visualizeApp',
              editUrl:
                '/management/kibana/objects/savedVisualizations/a42c0580-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
            },
          },
        ]);
      });

      it('should filter based on savedObjectTypes', async () => {
        const resp = await supertest
          .get(
            relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357', ['visualization'])
          )
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: '8963ca30-3224-11e8-a572-ffca06da1357',
            type: 'index-pattern',
            meta: {
              icon: 'indexPatternApp',
              title: 'saved_objects*',
              editUrl:
                '/management/kibana/indexPatterns/patterns/8963ca30-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path:
                  '/app/management/kibana/indexPatterns/patterns/8963ca30-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
            },
            relationship: 'child',
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              editUrl:
                '/management/kibana/objects/savedVisualizations/a42c0580-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
            },
            relationship: 'parent',
          },
        ]);
      });

      // TODO: https://github.com/elastic/kibana/issues/19713 causes this test to fail.
      it.skip('should return 404 if search finds no results', async () => {
        await supertest
          .get(relationshipsUrl('search', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .expect(404);
      });
    });

    describe('dashboards', () => {
      it('should validate dashboard response schema', async () => {
        const resp = await supertest
          .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });

      it('should work for dashboards', async () => {
        const resp = await supertest
          .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              editUrl:
                '/management/kibana/objects/savedVisualizations/add810b0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/add810b0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
            },
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              editUrl:
                '/management/kibana/objects/savedVisualizations/a42c0580-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
            },
          },
        ]);
      });

      it('should filter based on savedObjectTypes', async () => {
        const resp = await supertest
          .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357', ['search']))
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              editUrl:
                '/management/kibana/objects/savedVisualizations/add810b0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/add810b0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
            },
            relationship: 'child',
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              editUrl:
                '/management/kibana/objects/savedVisualizations/a42c0580-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
            },
            relationship: 'child',
          },
        ]);
      });

      // TODO: https://github.com/elastic/kibana/issues/19713 causes this test to fail.
      it.skip('should return 404 if dashboard finds no results', async () => {
        await supertest
          .get(relationshipsUrl('dashboard', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .expect(404);
      });
    });

    describe('visualizations', () => {
      it('should validate visualization response schema', async () => {
        const resp = await supertest
          .get(relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });

      it('should work for visualizations', async () => {
        const resp = await supertest
          .get(relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            relationship: 'child',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              editUrl:
                '/management/kibana/objects/savedSearches/960372e0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
            },
          },
          {
            id: 'b70c7ae0-3224-11e8-a572-ffca06da1357',
            type: 'dashboard',
            relationship: 'parent',
            meta: {
              icon: 'dashboardApp',
              title: 'Dashboard',
              editUrl:
                '/management/kibana/objects/savedDashboards/b70c7ae0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'dashboard.show',
              },
            },
          },
        ]);
      });

      it('should filter based on savedObjectTypes', async () => {
        const resp = await supertest
          .get(
            relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357', ['search'])
          )
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              editUrl:
                '/management/kibana/objects/savedSearches/960372e0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
            },
            relationship: 'child',
          },
        ]);
      });

      it('should return 404 if visualizations finds no results', async () => {
        await supertest
          .get(relationshipsUrl('visualization', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .expect(404);
      });
    });

    describe('index patterns', () => {
      it('should validate visualization response schema', async () => {
        const resp = await supertest
          .get(relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });

      it('should work for index patterns', async () => {
        const resp = await supertest
          .get(relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357'))
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            relationship: 'parent',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              editUrl:
                '/management/kibana/objects/savedSearches/960372e0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
            },
          },
          {
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'parent',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              editUrl:
                '/management/kibana/objects/savedVisualizations/add810b0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/visualize#/edit/add810b0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'visualize.show',
              },
            },
          },
        ]);
      });

      it('should filter based on savedObjectTypes', async () => {
        const resp = await supertest
          .get(
            relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357', ['search'])
          )
          .expect(200);

        expect(resp.body).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              editUrl:
                '/management/kibana/objects/savedSearches/960372e0-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
            },
            relationship: 'parent',
          },
        ]);
      });

      it('should return 404 if index pattern finds no results', async () => {
        await supertest
          .get(relationshipsUrl('index-pattern', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .expect(404);
      });
    });
  });
}
