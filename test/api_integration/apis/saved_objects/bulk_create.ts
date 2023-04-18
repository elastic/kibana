/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const SPACE_ID = 'ftr-so-bulk-create';

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
    before(async () => {
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
        { space: SPACE_ID }
      );
    });

    after(() => kibanaServer.spaces.delete(SPACE_ID));

    it('should return 200 with individual responses', async () =>
      await supertest
        .post(`/s/${SPACE_ID}/api/saved_objects/_bulk_create`)
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
                created_at: resp.body.saved_objects[1].created_at,
                version: resp.body.saved_objects[1].version,
                attributes: {
                  title: 'A great new dashboard',
                },
                migrationVersion: {
                  dashboard: resp.body.saved_objects[1].migrationVersion.dashboard,
                },
                coreMigrationVersion: '8.8.0',
                typeMigrationVersion: resp.body.saved_objects[1].typeMigrationVersion,
                references: [],
                namespaces: [SPACE_ID],
              },
            ],
          });
        }));

    it('should not return raw id when object id is unspecified', async () =>
      await supertest
        .post(`/s/${SPACE_ID}/api/saved_objects/_bulk_create`)
        .send(BULK_REQUESTS.map(({ id, ...rest }) => rest))
        .expect(200)
        .then((resp) => {
          resp.body.saved_objects.map(({ id }: { id: string }) =>
            expect(id).not.match(/visualization|dashboard/)
          );
        }));
  });
}
