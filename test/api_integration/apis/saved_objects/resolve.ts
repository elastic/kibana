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
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('resolve', () => {
    describe('with kibana index', () => {
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

      it('should return 200', async () =>
        await supertest
          .get(`/api/saved_objects/resolve/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200)
          .then((resp) => {
            resp.body.saved_object.updated_at = '2015-01-01T00:00:00.000Z';
            resp.body.saved_object.created_at = '2015-01-01T00:00:00.000Z';

            expect(resp.body).to.eql({
              saved_object: {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                type: 'visualization',
                updated_at: '2015-01-01T00:00:00.000Z',
                created_at: '2015-01-01T00:00:00.000Z',
                version: resp.body.saved_object.version,
                migrationVersion: resp.body.saved_object.migrationVersion,
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: resp.body.saved_object.typeMigrationVersion,
                managed: resp.body.saved_object.managed,
                attributes: {
                  title: 'Count of requests',
                  description: '',
                  version: 1,
                  // cheat for some of the more complex attributes
                  visState: resp.body.saved_object.attributes.visState,
                  uiStateJSON: resp.body.saved_object.attributes.uiStateJSON,
                  kibanaSavedObjectMeta: resp.body.saved_object.attributes.kibanaSavedObjectMeta,
                },
                references: [
                  {
                    type: 'index-pattern',
                    name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                    id: '91200a00-9efd-11e7-acb3-3dab96693fab',
                  },
                ],
                namespaces: ['default'],
              },
              outcome: 'exactMatch',
            });
            expect(resp.body.saved_object.migrationVersion).to.be.ok();
            expect(resp.body.saved_object.typeMigrationVersion).to.be.ok();
            expect(resp.body.saved_object.managed).to.not.be.ok();
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
          .get(`/api/saved_objects/resolve/config/7.0.0-alpha1`)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .expect(200);

        expect(body.saved_object.coreMigrationVersion).to.be.ok();
        expect(body.saved_object.coreMigrationVersion).not.to.be('7.0.0');
        expect(body.saved_object.typeMigrationVersion).to.be.ok();
        expect(body.saved_object.typeMigrationVersion).not.to.be('7.0.0');
      });

      describe('doc does not exist', () => {
        it('should return same generic error as when index does not exist', async () =>
          await supertest
            .get(`/api/saved_objects/resolve/visualization/foobar`)
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
  });
}
