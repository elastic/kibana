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

  describe('create', () => {
    let KIBANA_VERSION: string;

    before(async () => {
      KIBANA_VERSION = await getKibanaVersion(getService);
    });

    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));
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

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await es.indices.delete({ index: '.kibana' }, { ignore: [404] })
      );

      it('should return 200 and create kibana index', async () => {
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
              version: resp.body.version,
              attributes: {
                title: 'My favorite vis',
              },
              references: [],
              namespaces: ['default'],
            });
            expect(resp.body.migrationVersion).to.be.ok();
          });

        expect((await es.indices.exists({ index: '.kibana' })).body).to.be(true);
      });

      it('result should have the latest coreMigrationVersion', async () => {
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
  });
}
