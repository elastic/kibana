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
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('create', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));
      it('should return 200', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis'
            }
          })
          .expect(200)
          .then(resp => {
            // loose uuid validation
            expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

            // loose ISO8601 UTC time with milliseconds validation
            expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

            expect(resp.body).to.eql({
              id: resp.body.id,
              type: 'visualization',
              migrationVersion: resp.body.migrationVersion,
              updated_at: resp.body.updated_at,
              version: 'WzgsMV0=',
              attributes: {
                title: 'My favorite vis'
              },
              references: [],
            });
            expect(resp.body.migrationVersion).to.be.ok();
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

      it('should return 200 and create kibana index', async () => {
        await supertest
          .post(`/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My favorite vis'
            }
          })
          .expect(200)
          .then(resp => {
            // loose uuid validation
            expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

            // loose ISO8601 UTC time with milliseconds validation
            expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

            expect(resp.body).to.eql({
              id: resp.body.id,
              type: 'visualization',
              migrationVersion: resp.body.migrationVersion,
              updated_at: resp.body.updated_at,
              version: 'WzAsMV0=',
              attributes: {
                title: 'My favorite vis'
              },
              references: [],
            });
            expect(resp.body.migrationVersion).to.be.ok();
          });

        expect(await es.indices.exists({ index: '.kibana' }))
          .to.be(true);
      });
    });
  });
}
