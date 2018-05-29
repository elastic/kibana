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

  describe('relationships', () => {
    before(() => esArchiver.load('management/saved_objects'));
    after(() => esArchiver.unload('management/saved_objects'));

    it('should work for searches', async () => {
      await supertest
        .get(
          `/api/kibana/management/saved_objects/relationships/search/960372e0-3224-11e8-a572-ffca06da1357`
        )
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            visualizations: [
              {
                id: 'a42c0580-3224-11e8-a572-ffca06da1357',
                title: 'VisualizationFromSavedSearch',
              },
            ],
            indexPatterns: [
              {
                id: '8963ca30-3224-11e8-a572-ffca06da1357',
                title: 'saved_objects*',
              },
            ],
          });
        });
    });

    it('should work for dashboards', async () => {
      await supertest
        .get(
          `/api/kibana/management/saved_objects/relationships/dashboard/b70c7ae0-3224-11e8-a572-ffca06da1357`
        )
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            visualizations: [
              {
                id: 'add810b0-3224-11e8-a572-ffca06da1357',
                title: 'Visualization',
              },
              {
                id: 'a42c0580-3224-11e8-a572-ffca06da1357',
                title: 'VisualizationFromSavedSearch',
              },
            ],
          });
        });
    });

    it('should work for visualizations', async () => {
      await supertest
        .get(
          `/api/kibana/management/saved_objects/relationships/visualization/a42c0580-3224-11e8-a572-ffca06da1357`
        )
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            dashboards: [
              {
                id: 'b70c7ae0-3224-11e8-a572-ffca06da1357',
                title: 'Dashboard',
              },
            ],
          });
        });
    });

    it('should work for index patterns', async () => {
      await supertest
        .get(
          `/api/kibana/management/saved_objects/relationships/index-pattern/8963ca30-3224-11e8-a572-ffca06da1357`
        )
        .expect(200)
        .then(resp => {
          expect(resp.body).to.eql({
            searches: [
              {
                id: '960372e0-3224-11e8-a572-ffca06da1357',
                title: 'OneRecord',
              },
            ],
            visualizations: [
              {
                id: 'add810b0-3224-11e8-a572-ffca06da1357',
                title: 'Visualization',
              },
            ],
          });
        });
    });
  });
}
