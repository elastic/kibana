/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  const BULK_REQUESTS = [
    {
      type: 'visualization',
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
    },
    {
      type: 'dashboard',
      id: 'does not exist',
    },
    {
      type: 'config',
      id: '7.0.0-alpha1',
    },
  ];

  const BULK_REQUESTS_MANAGED = [
    {
      type: 'visualization',
      id: '3fdaa535-5baf-46bc-8265-705eda43b181',
    },
    {
      type: 'tag',
      id: '0ed60f29-2021-4fd2-ba4e-943c61e2738c',
    },
    {
      type: 'tag',
      id: '00ad6a46-6ac3-4f6c-892c-2f72c54a5e7d',
    },
    {
      type: 'dashboard',
      id: '11fb046d-0e50-48a0-a410-a744b82cbffd',
    },
  ];

  describe('_bulk_get', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/managed_basic.json'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/managed_basic.json'
      );
    });

    it('should return 200 with individual responses', async () =>
      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .send(BULK_REQUESTS)
        .expect(200)
        .then((resp) => {
          const mockDate = '2015-01-01T00:00:00.000Z';
          resp.body.saved_objects[0].updated_at = mockDate;
          resp.body.saved_objects[2].updated_at = mockDate;
          resp.body.saved_objects[0].created_at = mockDate;
          resp.body.saved_objects[2].created_at = mockDate;

          expect(resp.body).to.eql({
            saved_objects: [
              {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                type: 'visualization',
                updated_at: '2015-01-01T00:00:00.000Z',
                created_at: '2015-01-01T00:00:00.000Z',
                version: resp.body.saved_objects[0].version,
                attributes: {
                  title: 'Count of requests',
                  description: '',
                  version: 1,
                  // cheat for some of the more complex attributes
                  visState: resp.body.saved_objects[0].attributes.visState,
                  uiStateJSON: resp.body.saved_objects[0].attributes.uiStateJSON,
                  kibanaSavedObjectMeta:
                    resp.body.saved_objects[0].attributes.kibanaSavedObjectMeta,
                },
                migrationVersion: resp.body.saved_objects[0].migrationVersion,
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: resp.body.saved_objects[0].typeMigrationVersion,
                managed: resp.body.saved_objects[0].managed,
                namespaces: ['default'],
                references: [
                  {
                    name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                    type: 'index-pattern',
                    id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                  },
                ],
              },
              {
                id: 'does not exist',
                type: 'dashboard',
                error: {
                  error: 'Not Found',
                  message: 'Saved object [dashboard/does not exist] not found',
                  statusCode: 404,
                },
              },
              {
                id: '7.0.0-alpha1',
                type: 'config',
                updated_at: '2015-01-01T00:00:00.000Z',
                created_at: '2015-01-01T00:00:00.000Z',
                version: resp.body.saved_objects[2].version,
                attributes: {
                  buildNum: 8467,
                  defaultIndex: '91200a00-9efd-11e7-acb3-3dab96693fab',
                },
                namespaces: ['default'],
                migrationVersion: resp.body.saved_objects[2].migrationVersion,
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: resp.body.saved_objects[2].typeMigrationVersion,
                managed: resp.body.saved_objects[2].managed,
                references: [],
              },
            ],
          });
          expect(resp.body.saved_objects[0].migrationVersion).to.be.ok();
          expect(resp.body.saved_objects[0].typeMigrationVersion).to.be.ok();
        }));

    it('should return 200 with individual responses that include the managed property of each object', async () =>
      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .send(BULK_REQUESTS_MANAGED)
        .expect(200)
        .then((resp) => {
          const mockDate = '2015-01-01T00:00:00.000Z';
          resp.body.saved_objects[0].updated_at = mockDate;
          resp.body.saved_objects[1].updated_at = mockDate;
          resp.body.saved_objects[2].updated_at = mockDate;
          resp.body.saved_objects[3].updated_at = mockDate;
          resp.body.saved_objects[0].created_at = mockDate;
          resp.body.saved_objects[1].created_at = mockDate;
          resp.body.saved_objects[2].created_at = mockDate;
          resp.body.saved_objects[3].created_at = mockDate;
          expect(resp.body.saved_objects.length).to.eql(4);
          expect(resp.body).to.eql({
            saved_objects: [
              {
                id: '3fdaa535-5baf-46bc-8265-705eda43b181',
                type: 'visualization',
                namespaces: ['default'],
                migrationVersion: {
                  visualization: '8.5.0',
                },
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: '8.5.0',
                updated_at: '2015-01-01T00:00:00.000Z',
                created_at: '2015-01-01T00:00:00.000Z',
                version: resp.body.saved_objects[0].version,
                attributes: {
                  description: '',
                  kibanaSavedObjectMeta: {
                    searchSourceJSON:
                      resp.body.saved_objects[0].attributes.kibanaSavedObjectMeta.searchSourceJSON,
                  },
                  title: 'Managed Count of requests',
                  uiStateJSON: '{"spy":{"mode":{"name":null,"fill":false}}}',
                  version: resp.body.saved_objects[0].attributes.version,
                  visState: resp.body.saved_objects[0].attributes.visState,
                },
                references: [
                  {
                    id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                    name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                    type: 'index-pattern',
                  },
                ],
                managed: true,
              },
              {
                id: '0ed60f29-2021-4fd2-ba4e-943c61e2738c',
                type: 'tag',
                updated_at: '2015-01-01T00:00:00.000Z',
                created_at: '2015-01-01T00:00:00.000Z',
                namespaces: ['default'],
                migrationVersion: {
                  tag: '8.0.0',
                },
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: '8.0.0',
                version: resp.body.saved_objects[1].version,
                attributes: { color: '#E7664C', description: 'read-only', name: 'managed' },
                references: [],
                managed: true,
              },
              {
                id: '00ad6a46-6ac3-4f6c-892c-2f72c54a5e7d',
                type: 'tag',
                namespaces: ['default'],
                migrationVersion: {
                  tag: '8.0.0',
                },
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: '8.0.0',
                updated_at: '2015-01-01T00:00:00.000Z',
                created_at: '2015-01-01T00:00:00.000Z',
                version: resp.body.saved_objects[2].version,
                attributes: { color: '#173a58', description: 'Editable', name: 'unmanaged' },
                references: [],
                managed: false,
              },
              {
                id: '11fb046d-0e50-48a0-a410-a744b82cbffd',
                type: 'dashboard',
                namespaces: ['default'],
                migrationVersion: {
                  dashboard: '10.2.0',
                },
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: '10.2.0',
                updated_at: '2015-01-01T00:00:00.000Z',
                created_at: '2015-01-01T00:00:00.000Z',
                version: resp.body.saved_objects[3].version,
                attributes: {
                  description: '',
                  hits: 0,
                  kibanaSavedObjectMeta:
                    resp.body.saved_objects[3].attributes.kibanaSavedObjectMeta,
                  optionsJSON: '{"darkTheme":false}',
                  panelsJSON: resp.body.saved_objects[3].attributes.panelsJSON,
                  refreshInterval: resp.body.saved_objects[3].attributes.refreshInterval,
                  timeFrom: 'Wed Sep 16 2015 22:52:17 GMT-0700',
                  timeRestore: true,
                  timeTo: 'Fri Sep 18 2015 12:24:38 GMT-0700',
                  title: 'Managed Requests',
                  version: resp.body.saved_objects[3].attributes.version,
                },
                references: [
                  {
                    id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                    name: '1:panel_1',
                    type: 'visualization',
                  },
                ],
                managed: true,
              },
            ],
          });
          expect(resp.body.saved_objects[0].managed).to.be.ok();
          expect(resp.body.saved_objects[1].managed).to.be.ok();
          expect(resp.body.saved_objects[2].managed).not.to.be.ok();
          expect(resp.body.saved_objects[3].managed).to.be.ok();
        }));

    it('should migrate saved object before returning', async () => {
      await es.update({
        index: MAIN_SAVED_OBJECT_INDEX,
        id: 'config:7.0.0-alpha1',
        doc: {
          coreMigrationVersion: '7.0.0',
          typeMigrationVersion: '7.0.0',
        },
      });

      const { body } = await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .send([
          {
            type: 'config',
            id: '7.0.0-alpha1',
          },
        ])
        .expect(200);

      expect(body.saved_objects[0].coreMigrationVersion).to.be.ok();
      expect(body.saved_objects[0].coreMigrationVersion).not.to.be('7.0.0');
      expect(body.saved_objects[0].typeMigrationVersion).to.be.ok();
      expect(body.saved_objects[0].typeMigrationVersion).not.to.be('7.0.0');
    });
  });
}
