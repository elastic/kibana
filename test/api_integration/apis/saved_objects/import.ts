/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { join } from 'path';
import dedent from 'dedent';
import type { SavedObjectsImportFailure } from '@kbn/core/server';
import type { FtrProviderContext } from '../../ftr_provider_context';

const createConflictError = (
  object: Omit<SavedObjectsImportFailure, 'error'>
): SavedObjectsImportFailure => ({
  ...object,
  error: { type: 'conflict' },
});

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('import', () => {
    // mock success results including metadata
    const indexPattern = {
      type: 'index-pattern',
      id: '91200a00-9efd-11e7-acb3-3dab96693fab',
      meta: { title: 'logstash-*', icon: 'indexPatternApp' },
    };
    const visualization = {
      type: 'visualization',
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
      meta: { title: 'Count of requests', icon: 'visualizeApp' },
    };
    const dashboard = {
      type: 'dashboard',
      id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
      meta: { title: 'Requests', icon: 'dashboardApp' },
    };
    const managedVis = {
      id: '3fdaa535-5baf-46bc-8265-705eda43b181',
      type: 'visualization',
      meta: {
        icon: 'visualizeApp',
        title: 'Managed Count of requests',
      },
      managed: true,
    };
    const managedTag = {
      id: '0ed60f29-2021-4fd2-ba4e-943c61e2738c',
      type: 'tag',
      meta: {
        icon: 'tag',
        title: 'managed',
      },
      managed: true,
    };
    const unmanagedTag = {
      id: '00ad6a46-6ac3-4f6c-892c-2f72c54a5e7d',
      type: 'tag',
      meta: {
        icon: 'tag',
        title: 'unmanaged',
      },
      managed: false,
    };
    const managedDB = {
      id: '11fb046d-0e50-48a0-a410-a744b82cbffd',
      type: 'dashboard',
      meta: {
        icon: 'dashboardApp',
        title: 'Managed Requests',
      },
      managed: true,
    };

    describe('with basic data existing', () => {
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

      it('should return errors when conflicts exist', async () => {
        await supertest
          .post('/api/saved_objects/_import')
          .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: false,
              successCount: 0,
              errors: [
                createConflictError(indexPattern),
                createConflictError(visualization),
                createConflictError(dashboard),
              ],
              warnings: [],
            });
          });
      });

      it('should return 200 when conflicts exist but overwrite is passed in', async () => {
        await supertest
          .post('/api/saved_objects/_import')
          .query({ overwrite: true })
          .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 3,
              successResults: [
                { ...indexPattern, overwrite: true, managed: false },
                { ...visualization, overwrite: true, managed: false },
                { ...dashboard, overwrite: true, managed: false },
              ],
              warnings: [],
            });
          });
      });

      it('should return 200 when trying to import unsupported types', async () => {
        const fileBuffer = Buffer.from(
          '{"id":"1","type":"wigwags","attributes":{"title":"my title"},"references":[]}',
          'utf8'
        );
        await supertest
          .post('/api/saved_objects/_import')
          .attach('file', fileBuffer, 'export.ndjson')
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: false,
              successCount: 0,
              errors: [
                {
                  id: '1',
                  type: 'wigwags',
                  meta: { title: 'my title' },
                  error: { type: 'unsupported_type' },
                },
              ],
              warnings: [],
            });
          });
      });

      it('should return 200 when importing SO with circular refs', async () => {
        const fileBuffer = Buffer.from(
          dedent`
            {"attributes":{"title":"dashboard-b"},"id":"dashboard-b","references":[{"id":"dashboard-a","name":"circular-dashboard-ref","type":"dashboard"}],"type":"dashboard"}
            {"attributes":{"title":"dashboard-a"},"id":"dashboard-a","references":[{"id":"dashboard-b","name":"circular-dashboard-ref","type":"dashboard"}],"type":"dashboard"}
          `,
          'utf8'
        );
        const resp = await supertest
          .post('/api/saved_objects/_import')
          .attach('file', fileBuffer, 'export.ndjson')
          .expect(200);

        expect(resp.body).to.eql({
          success: true,
          successCount: 2,
          successResults: [
            {
              id: 'dashboard-b',
              meta: {
                icon: 'dashboardApp',
                title: 'dashboard-b',
              },
              type: 'dashboard',
              managed: false,
            },
            {
              id: 'dashboard-a',
              meta: {
                icon: 'dashboardApp',
                title: 'dashboard-a',
              },
              type: 'dashboard',
              managed: false,
            },
          ],
          warnings: [],
        });
      });

      it('should return 400 when trying to import more than 10,000 objects', async () => {
        const fileChunks = [];
        for (let i = 0; i <= 10001; i++) {
          fileChunks.push(`{"type":"visualization","id":"${i}","attributes":{},"references":[]}`);
        }
        await supertest
          .post('/api/saved_objects/_import')
          .attach('file', Buffer.from(fileChunks.join('\n'), 'utf8'), 'export.ndjson')
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: "Can't import more than 10001 objects",
            });
          });
      });

      it('should return errors when index patterns or search are missing', async () => {
        const objectsToImport = [
          JSON.stringify({
            type: 'visualization',
            id: '1',
            attributes: { title: 'My visualization' },
            references: [
              {
                name: 'ref_0',
                type: 'index-pattern',
                id: 'non-existing',
              },
              {
                name: 'ref_1',
                type: 'search',
                id: 'non-existing-search',
              },
            ],
          }),
        ];
        await supertest
          .post('/api/saved_objects/_import')
          .attach('file', Buffer.from(objectsToImport.join('\n'), 'utf8'), 'export.ndjson')
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: false,
              successCount: 0,
              errors: [
                {
                  type: 'visualization',
                  id: '1',
                  meta: { title: 'My visualization', icon: 'visualizeApp' },
                  error: {
                    type: 'missing_references',
                    references: [
                      {
                        type: 'index-pattern',
                        id: 'non-existing',
                      },
                      {
                        type: 'search',
                        id: 'non-existing-search',
                      },
                    ],
                  },
                },
              ],
              warnings: [],
            });
          });
      });

      it('should retain existing saved object managed property', async () => {
        const objectsToImport = [
          JSON.stringify({
            type: 'config',
            id: '1234',
            attributes: {},
            references: [],
            managed: true,
          }),
        ];
        await supertest
          .post('/api/saved_objects/_import')
          .attach('file', Buffer.from(objectsToImport.join('\n'), 'utf8'), 'export.ndjson')
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 1,
              successResults: [
                {
                  id: '1234',
                  meta: {
                    title: 'Advanced Settings [1234]',
                  },
                  type: 'config',
                  managed: true,
                },
              ],
              warnings: [],
            });
          });
      });

      it('should not overwrite managed if set on objects beging imported', async () => {
        await supertest
          .post('/api/saved_objects/_import')
          .attach('file', join(__dirname, '../../fixtures/import_managed.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 4,
              successResults: [managedVis, unmanagedTag, managedTag, managedDB],
              warnings: [],
            });
          });
      });
      it('should return 200 when conflicts exist but overwrite is passed in, without changing managed property on the object', async () => {
        await supertest
          .post('/api/saved_objects/_import')
          .query({ overwrite: true })
          .attach('file', join(__dirname, '../../fixtures/import_managed.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 4,
              successResults: [
                { ...managedVis, overwrite: true },
                { ...unmanagedTag, overwrite: true },
                { ...managedTag, overwrite: true },
                { ...managedDB, overwrite: true },
              ],
              warnings: [],
            });
          });
      });
    });
  });
}
