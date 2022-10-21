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

  describe('create', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
    });

    it('should return 200', async () => {
      await supertest
        .post(`/api/saved_objects/visualization`)
        .send({
          attributes: {
            title: 'My favorite vis',
          },
        })
        .expect(200)
        .then((resp) => {
          // loose uuid validation
          expect(resp.body)
            .to.have.property('id')
            .match(/^[0-9a-f-]{36}$/);

          // loose ISO8601 UTC time with milliseconds validation
          expect(resp.body)
            .to.have.property('updated_at')
            .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

          expect(resp.body).to.eql({
            id: resp.body.id,
            type: 'visualization',
            migrationVersion: resp.body.migrationVersion,
            coreMigrationVersion: KIBANA_VERSION,
            updated_at: resp.body.updated_at,
            created_at: resp.body.created_at,
            version: resp.body.version,
            attributes: {
              title: 'My favorite vis',
            },
            references: [],
            namespaces: ['default'],
          });
          expect(resp.body.migrationVersion).to.be.ok();
        });
    });

    it('result should be updated to the latest coreMigrationVersion', async () => {
      await supertest
        .post(`/api/saved_objects/visualization`)
        .send({
          attributes: {
            title: 'My favorite vis',
          },
          coreMigrationVersion: '1.2.3',
        })
        .expect(200)
        .then((resp) => {
          expect(resp.body.coreMigrationVersion).to.eql(KIBANA_VERSION);
        });
    });
  });
}
