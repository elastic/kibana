/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getKibanaVersion } from './lib/saved_objects_test_utils';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('get', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
      await kibanaServer.importExport.load('saved_objects/basic');
    });
    after(() => kibanaServer.importExport.unload('saved_objects/basic'));

    it('should return 200', async () =>
      await supertest
        .get(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
            type: 'visualization',
            updated_at: resp.body.updated_at,
            version: resp.body.version,
            migrationVersion: resp.body.migrationVersion,
            coreMigrationVersion: KIBANA_VERSION,
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
        }));

    describe('doc does not exist', () => {
      it('should return same generic error as when index does not exist', async () =>
        await supertest
          .get(`/api/saved_objects/visualization/foobar`)
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
