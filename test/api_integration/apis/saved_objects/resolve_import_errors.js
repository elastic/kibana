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
import { join } from 'path';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('resolve_import_errors', () => {
    describe('without kibana index', () => {
      // Cleanup data that got created in import
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 and import nothing when empty parameters are passed in', async () => {
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 0,
            });
          });
      });

      it('should return 200 and import everything when overwrite parameters contains all objects', async () => {
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field('overwrites', JSON.stringify([
            {
              type: 'index-pattern',
              id: '91200a00-9efd-11e7-acb3-3dab96693fab',
            },
            {
              type: 'visualization',
              id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
            },
            {
              type: 'dashboard',
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
            },
          ]))
          .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 3,
            });
          });
      });

      it('should return 400 when no file passed in', async () => {
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field('skips', '[]')
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: 'child "file" fails because ["file" is required]',
              validation: { source: 'payload', keys: [ 'file' ] }
            });
          });
      });

      it('should return 200 when replacing references', async () => {
        const objToInsert = {
          id: '1',
          type: 'visualization',
          attributes: {
            title: 'My favorite vis',
          },
          references: [
            {
              name: 'ref_0',
              type: 'search',
              id: '1',
            },
          ]
        };
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field('replaceReferences', JSON.stringify(
            [
              {
                type: 'search',
                from: '1',
                to: '2',
              }
            ]
          ))
          .attach('file', Buffer.from(JSON.stringify(objToInsert), 'utf8'), 'export.ndjson')
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 1,
            });
          });
        await supertest
          .get('/api/saved_objects/visualization/1')
          .expect(200)
          .then((resp) => {
            expect(resp.body.references).to.eql([
              {
                name: 'ref_0',
                type: 'search',
                id: '2',
              },
            ]);
          });
      });

      it('should return 400 when resolving conflicts with a file containing more than 10,000 objects', async () => {
        const fileChunks = [];
        for (let i = 0; i < 10001; i++) {
          fileChunks.push(`{"type":"visualization","id":"${i}","attributes":{},"references":[]}`);
        }
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .attach('file', Buffer.from(fileChunks.join('\n'), 'utf8'), 'export.ndjson')
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Can\'t import more than 10000 objects',
            });
          });
      });
    });

    describe('with kibana index', () => {
      describe('with basic data existing', () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it('should return 200 when skipping all the records', async () => {
          await supertest
            .post('/api/saved_objects/_resolve_import_errors')
            .field('skips', JSON.stringify(
              [
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
              ]
            ))
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({ success: true, successCount: 0 });
            });
        });

        it('should return 200 when manually overwriting each object', async () => {
          await supertest
            .post('/api/saved_objects/_resolve_import_errors')
            .field('overwrites', JSON.stringify(
              [
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
              ]
            ))
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({ success: true, successCount: 3 });
            });
        });

        it('should return 200 with only one record when overwriting 1 and skipping 1', async () => {
          await supertest
            .post('/api/saved_objects/_resolve_import_errors')
            .field('overwrites', JSON.stringify(
              [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  type: 'visualization',
                },
              ]
            ))
            .field('skips', JSON.stringify(
              [
                {
                  id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                  type: 'index-pattern',
                },
              ]
            ))
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({ success: true, successCount: 1 });
            });
        });
      });
    });
  });
}
