/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { getKibanaVersion } from './lib/saved_objects_test_utils';

function ndjsonToObject(input: string) {
  return input.split('\n').map((str) => JSON.parse(str));
}
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const SPACE_ID = 'ftr-so-export';

  describe('export', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
        { space: SPACE_ID }
      );
    });

    after(() => kibanaServer.spaces.delete(SPACE_ID));

    describe('basic amount of saved objects', () => {
      it('should return objects in dependency order', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: ['index-pattern', 'search', 'visualization', 'dashboard'],
          })
          .expect(200)
          .then((resp) => {
            const objects = ndjsonToObject(resp.text);
            expect(objects).to.have.length(4);
            expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
            expect(objects[0]).to.have.property('type', 'index-pattern');
            expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
            expect(objects[1]).to.have.property('type', 'visualization');
            expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
            expect(objects[2]).to.have.property('type', 'dashboard');
            expect(objects[3]).to.have.property('exportedCount', 3);
            expect(objects[3]).to.have.property('missingRefCount', 0);
            expect(objects[3].missingReferences).to.have.length(0);
          });
      });

      it('should exclude the export details if asked', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: ['index-pattern', 'search', 'visualization', 'dashboard'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = ndjsonToObject(resp.text);
            expect(objects).to.have.length(3);
            expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
            expect(objects[0]).to.have.property('type', 'index-pattern');
            expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
            expect(objects[1]).to.have.property('type', 'visualization');
            expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
            expect(objects[2]).to.have.property('type', 'dashboard');
          });
      });

      it('should support including dependencies when exporting selected objects', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            includeReferencesDeep: true,
            objects: [
              {
                type: 'dashboard',
                id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              },
            ],
          })
          .expect(200)
          .then((resp) => {
            const objects = ndjsonToObject(resp.text);
            expect(objects).to.have.length(4);
            expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
            expect(objects[0]).to.have.property('type', 'index-pattern');
            expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
            expect(objects[1]).to.have.property('type', 'visualization');
            expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
            expect(objects[2]).to.have.property('type', 'dashboard');
            expect(objects[3]).to.have.property('exportedCount', 3);
            expect(objects[3]).to.have.property('missingRefCount', 0);
            expect(objects[3].missingReferences).to.have.length(0);
          });
      });

      it('should support including dependencies when exporting by type', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            includeReferencesDeep: true,
            type: ['dashboard'],
          })
          .expect(200)
          .then((resp) => {
            const objects = resp.text.split('\n').map((str) => JSON.parse(str));
            expect(objects).to.have.length(4);
            expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
            expect(objects[0]).to.have.property('type', 'index-pattern');
            expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
            expect(objects[1]).to.have.property('type', 'visualization');
            expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
            expect(objects[2]).to.have.property('type', 'dashboard');
            expect(objects[3]).to.have.property('exportedCount', 3);
            expect(objects[3]).to.have.property('missingRefCount', 0);
            expect(objects[3].missingReferences).to.have.length(0);
          });
      });

      it('should support including dependencies when exporting by type and search', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            includeReferencesDeep: true,
            type: ['dashboard'],
            search: 'Requests*',
          })
          .expect(200)
          .then((resp) => {
            const objects = ndjsonToObject(resp.text);
            expect(objects).to.have.length(4);
            expect(objects[0]).to.have.property('id', '91200a00-9efd-11e7-acb3-3dab96693fab');
            expect(objects[0]).to.have.property('type', 'index-pattern');
            expect(objects[1]).to.have.property('id', 'dd7caf20-9efd-11e7-acb3-3dab96693fab');
            expect(objects[1]).to.have.property('type', 'visualization');
            expect(objects[2]).to.have.property('id', 'be3733a0-9efe-11e7-acb3-3dab96693fab');
            expect(objects[2]).to.have.property('type', 'dashboard');
            expect(objects[3]).to.have.property('exportedCount', 3);
            expect(objects[3]).to.have.property('missingRefCount', 0);
            expect(objects[3].missingReferences).to.have.length(0);
          });
      });

      it(`should throw error when object doesn't exist`, async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            objects: [
              {
                type: 'dashboard',
                id: '1',
              },
            ],
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Error fetching objects to export',
              attributes: {
                objects: [
                  {
                    id: '1',
                    type: 'dashboard',
                    error: {
                      error: 'Not Found',
                      message: 'Saved object [dashboard/1] not found',
                      statusCode: 404,
                    },
                  },
                ],
              },
            });
          });
      });

      it(`should return 400 when exporting unsupported type`, async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: ['wigwags'],
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Trying to export non-exportable type(s): wigwags',
            });
          });
      });

      it(`should return 400 when exporting objects with unsupported type`, async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            objects: [
              {
                type: 'wigwags',
                id: '1',
              },
            ],
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Trying to export object(s) with non-exportable types: wigwags:1',
            });
          });
      });

      it('should export object with circular refs', async () => {
        const soWithCycliRefs = [
          {
            type: 'dashboard',
            id: 'dashboard-a',
            attributes: {
              title: 'dashboard-a',
            },
            references: [
              {
                name: 'circular-dashboard-ref',
                id: 'dashboard-b',
                type: 'dashboard',
              },
            ],
          },
          {
            type: 'dashboard',
            id: 'dashboard-b',
            attributes: {
              title: 'dashboard-b',
            },
            references: [
              {
                name: 'circular-dashboard-ref',
                id: 'dashboard-a',
                type: 'dashboard',
              },
            ],
          },
        ];
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_bulk_create`)
          .send(soWithCycliRefs)
          .expect(200);
        const resp = await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            includeReferencesDeep: true,
            type: ['dashboard'],
          })
          .expect(200);

        const objects = ndjsonToObject(resp.text);
        expect(objects.find((o) => o.id === 'dashboard-a')).to.be.ok();
        expect(objects.find((o) => o.id === 'dashboard-b')).to.be.ok();
      });
    });

    describe('10,000 objects', () => {
      before(async () => {
        const fileChunks = [];
        for (let i = 0; i <= 9995; i++) {
          fileChunks.push(
            JSON.stringify({
              type: 'visualization',
              id: `${SPACE_ID}-${i}`,
              attributes: {
                title: `My visualization (${i})`,
                uiStateJSON: '{}',
                visState: '{}',
              },
              references: [
                {
                  name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                  type: 'index-pattern',
                  id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                },
              ],
            })
          );
        }

        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_import`)
          .attach('file', Buffer.from(fileChunks.join('\n'), 'utf8'), 'export.ndjson')
          .expect(200);
      });

      it('should return 400 when exporting without type or objects passed in', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: '[request body]: expected a plain object value, but found [null] instead.',
            });
          });
      });

      it('should return 200 when exporting by single type', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: 'dashboard',
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            expect(resp.header['content-disposition']).to.eql(
              'attachment; filename="export.ndjson"'
            );
            expect(resp.header['content-type']).to.eql('application/ndjson');
            const objects = ndjsonToObject(resp.text);

            // Sort values aren't deterministic so we need to exclude them
            const { sort, ...obj } = objects[0];

            expect(obj).to.eql({
              attributes: {
                description: '',
                hits: 0,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
                },
                optionsJSON: objects[0].attributes.optionsJSON,
                panelsJSON: objects[0].attributes.panelsJSON,
                refreshInterval: {
                  display: 'Off',
                  pause: false,
                  value: 0,
                },
                timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
                timeRestore: true,
                timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
                title: 'Requests',
                version: 1,
              },
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              migrationVersion: objects[0].migrationVersion,
              coreMigrationVersion: KIBANA_VERSION,
              references: [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  name: '1:panel_1',
                  type: 'visualization',
                },
              ],
              type: 'dashboard',
              updated_at: objects[0].updated_at,
              created_at: objects[0].created_at,
              version: objects[0].version,
            });
            expect(objects[0].migrationVersion).to.be.ok();
            expect(() =>
              JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
            ).not.to.throwError();
            expect(() => JSON.parse(objects[0].attributes.optionsJSON)).not.to.throwError();
            expect(() => JSON.parse(objects[0].attributes.panelsJSON)).not.to.throwError();
          });
      });

      it('should return 200 when exporting by array type', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: ['dashboard'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            expect(resp.header['content-disposition']).to.eql(
              'attachment; filename="export.ndjson"'
            );
            expect(resp.header['content-type']).to.eql('application/ndjson');
            const objects = ndjsonToObject(resp.text);

            // Sort values aren't deterministic so we need to exclude them
            const { sort, ...obj } = objects[0];
            expect(obj).to.eql({
              attributes: {
                description: '',
                hits: 0,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
                },
                optionsJSON: objects[0].attributes.optionsJSON,
                panelsJSON: objects[0].attributes.panelsJSON,
                refreshInterval: {
                  display: 'Off',
                  pause: false,
                  value: 0,
                },
                timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
                timeRestore: true,
                timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
                title: 'Requests',
                version: 1,
              },
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              migrationVersion: objects[0].migrationVersion,
              coreMigrationVersion: KIBANA_VERSION,
              references: [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  name: '1:panel_1',
                  type: 'visualization',
                },
              ],
              type: 'dashboard',
              updated_at: objects[0].updated_at,
              created_at: objects[0].created_at,
              version: objects[0].version,
            });
            expect(objects[0].migrationVersion).to.be.ok();
            expect(() =>
              JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
            ).not.to.throwError();
            expect(() => JSON.parse(objects[0].attributes.optionsJSON)).not.to.throwError();
            expect(() => JSON.parse(objects[0].attributes.panelsJSON)).not.to.throwError();
          });
      });

      it('should return 200 when exporting by objects', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            objects: [
              {
                type: 'dashboard',
                id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              },
            ],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            expect(resp.header['content-disposition']).to.eql(
              'attachment; filename="export.ndjson"'
            );
            expect(resp.header['content-type']).to.eql('application/ndjson');
            const objects = ndjsonToObject(resp.text);

            // Sort values aren't deterministic so we need to exclude them
            const { sort, ...obj } = objects[0];
            expect(obj).to.eql({
              attributes: {
                description: '',
                hits: 0,
                kibanaSavedObjectMeta: {
                  searchSourceJSON: objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
                },
                optionsJSON: objects[0].attributes.optionsJSON,
                panelsJSON: objects[0].attributes.panelsJSON,
                refreshInterval: {
                  display: 'Off',
                  pause: false,
                  value: 0,
                },
                timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
                timeRestore: true,
                timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
                title: 'Requests',
                version: 1,
              },
              id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              migrationVersion: objects[0].migrationVersion,
              coreMigrationVersion: KIBANA_VERSION,
              references: [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  name: '1:panel_1',
                  type: 'visualization',
                },
              ],
              type: 'dashboard',
              updated_at: objects[0].updated_at,
              created_at: objects[0].updated_at,
              version: objects[0].version,
            });
            expect(objects[0].migrationVersion).to.be.ok();
            expect(() =>
              JSON.parse(objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON)
            ).not.to.throwError();
            expect(() => JSON.parse(objects[0].attributes.optionsJSON)).not.to.throwError();
            expect(() => JSON.parse(objects[0].attributes.panelsJSON)).not.to.throwError();
          });
      });

      it('should return 400 when exporting by type and objects', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: 'dashboard',
            objects: [
              {
                type: 'dashboard',
                id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              },
            ],
            excludeExportDetails: true,
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `Can't specify both "types" and "objects" properties when exporting`,
            });
          });
      });

      it('should allow exporting more than 10,000 objects if permitted by maxImportExportSize', async () => {
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: ['dashboard', 'visualization', 'search', 'index-pattern'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            expect(resp.header['content-disposition']).to.eql(
              'attachment; filename="export.ndjson"'
            );
            expect(resp.header['content-type']).to.eql('application/ndjson');
            const objects = ndjsonToObject(resp.text);
            expect(objects.length).to.eql(10001);
          });
      });

      it('should return 400 when exporting more than allowed by maxImportExportSize', async () => {
        let anotherCustomVisId: string;
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/visualization`)
          .send({
            attributes: {
              title: 'My other favorite vis',
            },
          })
          .expect(200)
          .then((resp) => {
            anotherCustomVisId = resp.body.id;
          });
        await supertest
          .post(`/s/${SPACE_ID}/api/saved_objects/_export`)
          .send({
            type: ['dashboard', 'visualization', 'search', 'index-pattern'],
            excludeExportDetails: true,
          })
          .expect(400)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `Can't export more than 10001 objects. If your server has enough memory, this limit can be increased by adjusting the \"savedObjects.maxImportExportSize\" setting.`,
            });
          });
        await supertest
          // @ts-expect-error TS complains about using `anotherCustomVisId` before it is assigned
          .delete(`/s/${SPACE_ID}/api/saved_objects/visualization/${anotherCustomVisId}`)
          .expect(200);
      });
    });
  });
}
