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
import { getKibanaVersion } from './lib/saved_objects_test_utils';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');

  describe('create', () => {
    let KIBANA_VERSION;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
    });

    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));
      it('should return 200', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis',
            },
          })
          .expect(200)
          .then((resp) => {
            // loose uuid validation
            expect(resp.body)
              .to.have.property('id')
              .match(/^[0-9a-f-]{36}$/);

            // loose ISO8601 UTC time with milliseconds validation
            expect(resp.body)
              .to.have.property('updated_at')
              .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

            expect(resp.body).to.eql({
              id: resp.body.id,
              type: 'visualization',
              migrationVersion: resp.body.migrationVersion,
              coreMigrationVersion: KIBANA_VERSION,
              updated_at: resp.body.updated_at,
              version: resp.body.version,
              attributes: {
                title: 'My favorite vis',
              },
              references: [],
              namespaces: ['default'],
            });
            expect(resp.body.migrationVersion).to.be.ok();
          });
      });

      it('result should be updated to the latest coreMigrationVersion', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis',
            },
            coreMigrationVersion: '1.2.3',
          })
          .expect(200)
          .then((resp) => {
            expect(resp.body.coreMigrationVersion).to.eql(KIBANA_VERSION);
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

      it('should return 200 and create kibana index', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis',
            },
          })
          .expect(200)
          .then((resp) => {
            // loose uuid validation
            expect(resp.body)
              .to.have.property('id')
              .match(/^[0-9a-f-]{36}$/);

            // loose ISO8601 UTC time with milliseconds validation
            expect(resp.body)
              .to.have.property('updated_at')
              .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

            expect(resp.body).to.eql({
              id: resp.body.id,
              type: 'visualization',
              migrationVersion: resp.body.migrationVersion,
              coreMigrationVersion: KIBANA_VERSION,
              updated_at: resp.body.updated_at,
              version: resp.body.version,
              attributes: {
                title: 'My favorite vis',
              },
              references: [],
              namespaces: ['default'],
            });
            expect(resp.body.migrationVersion).to.be.ok();
          });

        expect(await es.indices.exists({ index: '.kibana' })).to.be(true);
      });

      it('result should have the latest coreMigrationVersion', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis',
            },
            coreMigrationVersion: '1.2.3',
          })
          .expect(200)
          .then((resp) => {
            expect(resp.body.coreMigrationVersion).to.eql(KIBANA_VERSION);
          });
      });
    });
  });
}
