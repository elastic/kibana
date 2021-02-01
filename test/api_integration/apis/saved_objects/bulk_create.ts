/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getKibanaVersion } from './lib/saved_objects_test_utils';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  const BULK_REQUESTS = [
    {
      type: 'visualization',
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
      attributes: {
        title: 'An existing visualization',
      },
      coreMigrationVersion: '1.2.3',
    },
    {
      type: 'dashboard',
      id: 'a01b2f57-fcfd-4864-b735-09e28f0d815e',
      attributes: {
        title: 'A great new dashboard',
      },
    },
  ];

  describe('_bulk_create', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
    });

    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 with individual responses', async () =>
        await supertest
          .post(`/api/saved_objects/_bulk_create`)
          .send(BULK_REQUESTS)
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              saved_objects: [
                {
                  type: 'visualization',
                  id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
                  error: {
                    error: 'Conflict',
                    message:
                      'Saved object [visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab] conflict',
                    statusCode: 409,
                  },
                },
                {
                  type: 'dashboard',
                  id: 'a01b2f57-fcfd-4864-b735-09e28f0d815e',
                  updated_at: resp.body.saved_objects[1].updated_at,
                  version: resp.body.saved_objects[1].version,
                  attributes: {
                    title: 'A great new dashboard',
                  },
                  migrationVersion: {
                    dashboard: resp.body.saved_objects[1].migrationVersion.dashboard,
                  },
                  coreMigrationVersion: KIBANA_VERSION,
                  references: [],
                  namespaces: ['default'],
                },
              ],
            });
          }));

      it('should not return raw id when object id is unspecified', async () =>
        await supertest
          .post(`/api/saved_objects/_bulk_create`)
          .send(BULK_REQUESTS.map(({ id, ...rest }) => rest))
          .expect(200)
          .then((resp) => {
            resp.body.saved_objects.map(({ id }: { id: string }) =>
              expect(id).not.match(/visualization|dashboard/)
            );
          }));
    });

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await es.indices.delete({ index: '.kibana*' }, { ignore: [404] })
      );

      it('should return 200 with errors', async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await supertest
          .post('/api/saved_objects/_bulk_create')
          .send(BULK_REQUESTS)
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              saved_objects: [
                {
                  id: BULK_REQUESTS[0].id,
                  type: BULK_REQUESTS[0].type,
                  error: {
                    error: 'Internal Server Error',
                    message: 'An internal server error occurred',
                    statusCode: 500,
                  },
                },
                {
                  id: BULK_REQUESTS[1].id,
                  type: BULK_REQUESTS[1].type,
                  error: {
                    error: 'Internal Server Error',
                    message: 'An internal server error occurred',
                    statusCode: 500,
                  },
                },
              ],
            });
          });
      });
    });
  });
}
