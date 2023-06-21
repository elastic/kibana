/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { join } from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('resolve_import_errors', () => {
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
    const SPACE_ID = 'ftr-so-resolve_import_errors';

    describe('with basic data existing', () => {
      before(async () => {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_ID });
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
          { space: SPACE_ID }
        );
      });
      after(() => kibanaServer.spaces.delete(SPACE_ID));

      it('should return 200 when skipping all the records', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_resolve_import_errors`)
          .field('retries', '[]')
          .attach('file', join(__dirname, '../../fixtures/import.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({ success: true, successCount: 0, warnings: [] });
          });
      });

      it('should return 200 when manually overwriting each object', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_resolve_import_errors`)
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

      it('should return 200 with only one record when overwriting 1 and skipping 1', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_resolve_import_errors`)
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
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 1,
              successResults: [{ ...visualization, overwrite: true, managed: false }],
              warnings: [],
            });
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
          .post(`/s/${SPACE_ID}/api/saved_objects/_resolve_import_errors`)
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
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 1,
              successResults: [
                {
                  type: 'visualization',
                  id: '1',
                  meta: { title: 'My favorite vis', icon: 'visualizeApp' },
                  managed: false,
                },
              ],
              warnings: [],
            });
          });
        await supertest
          .get(`/s/${SPACE_ID}/api/saved_objects/visualization/1`)
          .expect(200)
          .then((resp) => {
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
}
