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
import { join } from 'path';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('import', () => {
    describe('with kibana index', () => {
      describe('without basic data existing', () => {
        // Cleanup data that got created in import
        after(() => esArchiver.unload('saved_objects/basic'));

        it('should return 200', async () => {
          await supertest
            .post('/api/saved_objects/_import')
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                success: true,
                successCount: 3,
              });
            });
        });

        it('should return 415 when no file passed in', async () => {
          await supertest
            .post('/api/saved_objects/_import')
            .expect(415)
            .then((resp) => {
              expect(resp.body).to.eql({
                statusCode: 415,
                error: 'Unsupported Media Type',
                message: 'Unsupported Media Type',
              });
            });
        });
      });

      describe('with basic data existing', () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it('should return 409 when conflicts exist', async () => {
          await supertest
            .post('/api/saved_objects/_import')
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(409)
            .then((resp) => {
              expect(resp.body).to.eql({
                message: 'Conflict',
                statusCode: 409,
                error: 'Conflict',
                objects: [
                  {
                    id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                    type: 'index-pattern',
                  },
                  {
                    id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                    type: 'visualization',
                  },
                  {
                    id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                    type: 'dashboard',
                  },
                ],
              });
            });
        });

        it('should return 200 when conflicts exist but overwrite is passed in', async () => {
          await supertest
            .post('/api/saved_objects/_import')
            .query({
              overwrite: true,
            })
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                success: true,
                successCount: 3,
              });
            });
        });
      });
    });
  });
}
