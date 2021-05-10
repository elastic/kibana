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

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('resolve', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
    });

    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200', async () =>
        await supertest
          .get(`/api/saved_objects/resolve/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              saved_object: {
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                type: 'visualization',
                updated_at: '2017-09-21T18:51:23.794Z',
                version: resp.body.saved_object.version,
                migrationVersion: resp.body.saved_object.migrationVersion,
                coreMigrationVersion: KIBANA_VERSION,
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

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await esDeleteAllIndices('.kibana')
      );

      it('should return basic 404 without mentioning index', async () =>
        await supertest
          .get('/api/saved_objects/resolve/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab')
          .expect(404)
          .then((resp) => {
            expect(resp.body).to.eql({
              error: 'Not Found',
              message:
                'Saved object [visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab] not found',
              statusCode: 404,
            });
          }));
    });
  });
}
