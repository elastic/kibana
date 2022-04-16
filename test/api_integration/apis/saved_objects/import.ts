/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
                { ...indexPattern, overwrite: true },
                { ...visualization, overwrite: true },
                { ...dashboard, overwrite: true },
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
            },
            {
              id: 'dashboard-a',
              meta: {
                icon: 'dashboardApp',
                title: 'dashboard-a',
              },
              type: 'dashboard',
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
    });
  });
}
