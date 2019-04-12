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
const Joi = require('joi');

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const GENERIC_RESPONSE_SCHEMA = Joi.array().items(
    Joi.object().keys({
      id: Joi.string()
        .uuid()
        .required(),
      type: Joi.string().required(),
      relationship: Joi.string().valid('parent', 'child').required(),
      meta: Joi.object().keys({
        title: Joi.string().required(),
        icon: Joi.string().required(),
        editUrl: Joi.string().required(),
        inAppUrl: Joi.string().required(),
      }).required(),
    })
  );

  describe('relationships', () => {
    before(() => esArchiver.load('management/saved_objects'));
    after(() => esArchiver.unload('management/saved_objects'));

    describe('searches', async () => {
      it('should validate search response schema', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/search/960372e0-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            const validationResult = Joi.validate(resp.body, GENERIC_RESPONSE_SCHEMA);
            expect(validationResult.error).to.be(null);
          });
      });

      it('should work for searches', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/search/960372e0-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql([
              {
                id: '8963ca30-3224-11e8-a572-ffca06da1357',
                type: 'index-pattern',
                relationship: 'child',
                meta: {
                  title: 'saved_objects*',
                  icon: 'indexPatternApp',
                  editUrl: '/management/kibana/index_patterns/8963ca30-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/management/kibana/index_patterns/8963ca30-3224-11e8-a572-ffca06da1357',
                },
              },
              {
                id: 'a42c0580-3224-11e8-a572-ffca06da1357',
                type: 'visualization',
                relationship: 'parent',
                meta: {
                  title: 'VisualizationFromSavedSearch',
                  icon: 'visualizeApp',
                  editUrl: '/management/kibana/objects/savedVisualizations/a42c0580-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/visualize/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                },
              },
            ]);
          });
      });

      //TODO: https://github.com/elastic/kibana/issues/19713 causes this test to fail.
      it.skip('should return 404 if search finds no results', async () => {
        await supertest.get(`/api/kibana/management/saved_objects/relationships/search/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).expect(404);
      });
    });

    describe('dashboards', async () => {
      it('should validate dashboard response schema', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/dashboard/b70c7ae0-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            const validationResult = Joi.validate(resp.body, GENERIC_RESPONSE_SCHEMA);
            expect(validationResult.error).to.be(null);
          });
      });

      it('should work for dashboards', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/dashboard/b70c7ae0-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql([
              {
                id: 'add810b0-3224-11e8-a572-ffca06da1357',
                type: 'visualization',
                relationship: 'child',
                meta: {
                  icon: 'visualizeApp',
                  title: 'Visualization',
                  editUrl: '/management/kibana/objects/savedVisualizations/add810b0-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/visualize/edit/add810b0-3224-11e8-a572-ffca06da1357',
                },
              },
              {
                id: 'a42c0580-3224-11e8-a572-ffca06da1357',
                type: 'visualization',
                relationship: 'child',
                meta: {
                  icon: 'visualizeApp',
                  title: 'VisualizationFromSavedSearch',
                  editUrl: '/management/kibana/objects/savedVisualizations/a42c0580-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/visualize/edit/a42c0580-3224-11e8-a572-ffca06da1357',
                },
              },
            ]);
          });
      });

      //TODO: https://github.com/elastic/kibana/issues/19713 causes this test to fail.
      it.skip('should return 404 if dashboard finds no results', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/dashboard/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
          .expect(404);
      });
    });

    describe('visualizations', async () => {
      it('should validate visualization response schema', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/visualization/a42c0580-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            const validationResult = Joi.validate(resp.body, GENERIC_RESPONSE_SCHEMA);
            expect(validationResult.error).to.be(null);
          });
      });

      it('should work for visualizations', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/visualization/a42c0580-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql([
              {
                id: '960372e0-3224-11e8-a572-ffca06da1357',
                type: 'search',
                relationship: 'child',
                meta: {
                  icon: 'search',
                  title: 'OneRecord',
                  editUrl: '/management/kibana/objects/savedSearches/960372e0-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/discover/960372e0-3224-11e8-a572-ffca06da1357',
                },
              },
              {
                id: 'b70c7ae0-3224-11e8-a572-ffca06da1357',
                type: 'dashboard',
                relationship: 'parent',
                meta: {
                  icon: 'dashboardApp',
                  title: 'Dashboard',
                  editUrl: '/management/kibana/objects/savedDashboards/b70c7ae0-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/dashboard/b70c7ae0-3224-11e8-a572-ffca06da1357',
                },
              },
            ]);
          });
      });

      it('should return 404 if  visualizations finds no results', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/visualization/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
          .expect(404);
      });
    });

    describe('index patterns', async () => {
      it('should validate visualization response schema', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/index-pattern/8963ca30-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            const validationResult = Joi.validate(resp.body, GENERIC_RESPONSE_SCHEMA);
            expect(validationResult.error).to.be(null);
          });
      });

      it('should work for index patterns', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/index-pattern/8963ca30-3224-11e8-a572-ffca06da1357`)
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql([
              {
                id: '960372e0-3224-11e8-a572-ffca06da1357',
                type: 'search',
                relationship: 'parent',
                meta: {
                  icon: 'search',
                  title: 'OneRecord',
                  editUrl: '/management/kibana/objects/savedSearches/960372e0-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/discover/960372e0-3224-11e8-a572-ffca06da1357',
                },
              },
              {
                id: 'add810b0-3224-11e8-a572-ffca06da1357',
                type: 'visualization',
                relationship: 'parent',
                meta: {
                  icon: 'visualizeApp',
                  title: 'Visualization',
                  editUrl: '/management/kibana/objects/savedVisualizations/add810b0-3224-11e8-a572-ffca06da1357',
                  inAppUrl: '/app/kibana#/visualize/edit/add810b0-3224-11e8-a572-ffca06da1357',
                },
              },
            ]);
          });
      });

      it('should return 404 if index pattern finds no results', async () => {
        await supertest
          .get(`/api/kibana/management/saved_objects/relationships/index-pattern/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
          .expect(404);
      });
    });
  });
}
