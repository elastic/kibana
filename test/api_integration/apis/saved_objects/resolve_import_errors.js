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

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('resolve_import_errors', () => {
    describe('without kibana index', () => {
      // Cleanup data that got created in import
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 and import nothing when empty parameters are passed in', async () => {
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field('retries', '[]')
          .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 0,
            });
          });
      });

      it('should return 200 and import everything when overwrite parameters contains all objects', async () => {
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field(
            'retries',
            JSON.stringify([
              {
                type: 'index-pattern',
                id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                overwrite: true,
              },
              {
                type: 'visualization',
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                overwrite: true,
              },
              {
                type: 'dashboard',
                id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                overwrite: true,
              },
            ])
          )
          .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 3,
            });
          });
      });

      it('should return 400 when no file passed in', async () => {
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field('retries', '[]')
          .expect(400)
          .then(resp => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: '[request body.file]: expected value of type [Stream] but got [undefined]',
            });
          });
      });

      it('should return 200 when retrying unsupported types', async () => {
        const fileBuffer = Buffer.from(
          '{"id":"1","type":"wigwags","attributes":{"title":"my title"},"references":[]}',
          'utf8'
        );
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field('retries', JSON.stringify([{ type: 'wigwags', id: '1' }]))
          .attach('file', fileBuffer, 'export.ndjson')
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              success: false,
              successCount: 0,
              errors: [
                {
                  id: '1',
                  type: 'wigwags',
                  title: 'my title',
                  error: {
                    type: 'unsupported_type',
                  },
                },
              ],
            });
          });
      });

      it('should return 400 when resolving conflicts with a file containing more than 10,000 objects', async () => {
        const fileChunks = [];
        for (let i = 0; i < 10001; i++) {
          fileChunks.push(`{"type":"visualization","id":"${i}","attributes":{},"references":[]}`);
        }
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field('retries', '[]')
          .attach('file', Buffer.from(fileChunks.join('\n'), 'utf8'), 'export.ndjson')
          .expect(400)
          .then(resp => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: "Can't import more than 10000 objects",
            });
          });
      });

      it('should return 200 with errors when missing references', async () => {
        const objToInsert = {
          id: '1',
          type: 'visualization',
          attributes: {
            title: 'My favorite vis',
            visState: '{}',
          },
          references: [
            {
              name: 'ref_0',
              type: 'index-pattern',
              id: '2',
            },
          ],
        };
        await supertest
          .post('/api/saved_objects/_resolve_import_errors')
          .field(
            'retries',
            JSON.stringify([
              {
                type: 'visualization',
                id: '1',
              },
            ])
          )
          .attach('file', Buffer.from(JSON.stringify(objToInsert), 'utf8'), 'export.ndjson')
          .expect(200)
          .then(resp => {
            expect(resp.body).to.eql({
              success: false,
              successCount: 0,
              errors: [
                {
                  id: '1',
                  type: 'visualization',
                  title: 'My favorite vis',
                  error: {
                    type: 'missing_references',
                    blocking: [],
                    references: [
                      {
                        type: 'index-pattern',
                        id: '2',
                      },
                    ],
                  },
                },
              ],
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
            .field('retries', '[]')
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({ success: true, successCount: 0 });
            });
        });

        it('should return 200 when manually overwriting each object', async () => {
          await supertest
            .post('/api/saved_objects/_resolve_import_errors')
            .field(
              'retries',
              JSON.stringify([
                {
                  id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                  type: 'index-pattern',
                  overwrite: true,
                },
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  type: 'visualization',
                  overwrite: true,
                },
                {
                  id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
                  type: 'dashboard',
                  overwrite: true,
                },
              ])
            )
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({ success: true, successCount: 3 });
            });
        });

        it('should return 200 with only one record when overwriting 1 and skipping 1', async () => {
          await supertest
            .post('/api/saved_objects/_resolve_import_errors')
            .field(
              'retries',
              JSON.stringify([
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  type: 'visualization',
                  overwrite: true,
                },
              ])
            )
            .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({ success: true, successCount: 1 });
            });
        });

        it('should return 200 when replacing references', async () => {
          const objToInsert = {
            id: '1',
            type: 'visualization',
            attributes: {
              title: 'My favorite vis',
              visState: '{}',
            },
            references: [
              {
                name: 'ref_0',
                type: 'index-pattern',
                id: '2',
              },
            ],
          };
          await supertest
            .post('/api/saved_objects/_resolve_import_errors')
            .field(
              'retries',
              JSON.stringify([
                {
                  type: 'visualization',
                  id: '1',
                  replaceReferences: [
                    {
                      type: 'index-pattern',
                      from: '2',
                      to: '91200a00-9efd-11e7-acb3-3dab96693fab',
                    },
                  ],
                },
              ])
            )
            .attach('file', Buffer.from(JSON.stringify(objToInsert), 'utf8'), 'export.ndjson')
            .expect(200)
            .then(resp => {
              expect(resp.body).to.eql({
                success: true,
                successCount: 1,
              });
            });
          await supertest
            .get('/api/saved_objects/visualization/1')
            .expect(200)
            .then(resp => {
              expect(resp.body.references).to.eql([
                {
                  name: 'ref_0',
                  type: 'index-pattern',
                  id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                },
              ]);
            });
        });
      });
    });
  });
}
