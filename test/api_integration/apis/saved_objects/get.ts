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
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('get', () => {
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

    it('should return 200', async () =>
      await supertest
        .get(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
            type: 'visualization',
            updated_at: resp.body.updated_at,
            created_at: resp.body.created_at,
            version: resp.body.version,
            migrationVersion: resp.body.migrationVersion,
            coreMigrationVersion: '8.8.0',
            typeMigrationVersion: resp.body.typeMigrationVersion,
            managed: resp.body.managed,
            attributes: {
              title: 'Count of requests',
              description: '',
              version: 1,
              // cheat for some of the more complex attributes
              visState: resp.body.attributes.visState,
              uiStateJSON: resp.body.attributes.uiStateJSON,
              kibanaSavedObjectMeta: resp.body.attributes.kibanaSavedObjectMeta,
            },
            references: [
              {
                type: 'index-pattern',
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                id: '91200a00-9efd-11e7-acb3-3dab96693fab',
              },
            ],
            namespaces: ['default'],
          });
          expect(resp.body.migrationVersion).to.be.ok();
          expect(resp.body.typeMigrationVersion).to.be.ok();
          expect(resp.body.managed).not.to.be.ok();
        }));
    it("should return an object's managed property", async () => {
      await supertest
        .get(`/api/saved_objects/dashboard/11fb046d-0e50-48a0-a410-a744b82cbffd`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            id: '11fb046d-0e50-48a0-a410-a744b82cbffd',
            type: 'dashboard',
            namespaces: ['default'],
            migrationVersion: {
              dashboard: '10.2.0',
            },
            coreMigrationVersion: '8.8.0',
            typeMigrationVersion: '10.2.0',
            updated_at: resp.body.updated_at,
            created_at: resp.body.created_at,
            version: resp.body.version,
            attributes: {
              description: '',
              hits: 0,
              kibanaSavedObjectMeta: resp.body.attributes.kibanaSavedObjectMeta,
              optionsJSON: '{"darkTheme":false}',
              panelsJSON: resp.body.attributes.panelsJSON,
              refreshInterval: resp.body.attributes.refreshInterval,
              timeFrom: resp.body.attributes.timeFrom,
              timeRestore: true,
              timeTo: resp.body.attributes.timeTo,
              title: 'Managed Requests',
              version: resp.body.attributes.version,
            },
            references: [
              {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                name: '1:panel_1',
                type: 'visualization',
              },
            ],
            managed: true,
          });
          expect(resp.body.migrationVersion).to.be.ok();
          expect(resp.body.typeMigrationVersion).to.be.ok();
          expect(resp.body.managed).to.be.ok();
        });
    });

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
        .get(`/api/saved_objects/config/7.0.0-alpha1`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

      expect(body.coreMigrationVersion).to.be.ok();
      expect(body.coreMigrationVersion).not.to.be('7.0.0');
      expect(body.typeMigrationVersion).to.be.ok();
      expect(body.typeMigrationVersion).not.to.be('7.0.0');
    });

    describe('doc does not exist', () => {
      it('should return same generic error as when index does not exist', async () =>
        await supertest
          .get(`/api/saved_objects/visualization/foobar`)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(404)
          .then((resp) => {
            expect(resp.body).to.eql({
              error: 'Not Found',
              message: 'Saved object [visualization/foobar] not found',
              statusCode: 404,
            });
          }));
    });
  });
}
