/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
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
          }));

      describe('doc does not exist', () => {
        it('should return same generic error as when index does not exist', async () =>
          await supertest
            .get(`/api/saved_objects/resolve/visualization/foobar`)
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
