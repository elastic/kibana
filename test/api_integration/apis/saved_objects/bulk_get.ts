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
  const esArchiver = getService('esArchiver');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

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

  describe('_bulk_get', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
    });

    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 with individual responses', async () =>
        await supertest
          .post(`/api/saved_objects/_bulk_get`)
          .send(BULK_REQUESTS)
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              saved_objects: [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  type: 'visualization',
                  updated_at: '2017-09-21T18:51:23.794Z',
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
                  coreMigrationVersion: KIBANA_VERSION,
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
                  updated_at: '2017-09-21T18:49:16.302Z',
                  version: resp.body.saved_objects[2].version,
                  attributes: {
                    buildNum: 8467,
                    defaultIndex: '91200a00-9efd-11e7-acb3-3dab96693fab',
                  },
                  namespaces: ['default'],
                  migrationVersion: resp.body.saved_objects[2].migrationVersion,
                  coreMigrationVersion: KIBANA_VERSION,
                  references: [],
                },
              ],
            });
            expect(resp.body.saved_objects[0].migrationVersion).to.be.ok();
          }));
    });

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await esDeleteAllIndices('.kibana')
      );

      it('should return 200 with individual responses', async () =>
        await supertest
          .post('/api/saved_objects/_bulk_get')
          .send(BULK_REQUESTS)
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              saved_objects: [
                {
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  type: 'visualization',
                  error: {
                    error: 'Not Found',
                    message:
                      'Saved object [visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab] not found',
                    statusCode: 404,
                  },
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
                  error: {
                    error: 'Not Found',
                    message: 'Saved object [config/7.0.0-alpha1] not found',
                    statusCode: 404,
                  },
                },
              ],
            });
          }));
    });
  });
}
