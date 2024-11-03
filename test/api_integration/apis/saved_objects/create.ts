/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('create', () => {
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

    it('should return 200', async () => {
      await supertest
        .post(`/api/saved_objects/visualization`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
            coreMigrationVersion: '8.8.0',
            typeMigrationVersion: resp.body.typeMigrationVersion,
            managed: resp.body.managed,
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
          expect(resp.body.typeMigrationVersion).to.be.ok();
          expect(resp.body.managed).to.not.be.ok();
        });
    });

    it('result should not be updated to the latest Kibana version if there are no migrations', async () => {
      await supertest
        .post(`/api/saved_objects/visualization`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          attributes: {
            title: 'My favorite vis',
          },
          coreMigrationVersion: '8.8.0',
        })
        .expect(200)
        .then((resp) => {
          expect(resp.body.coreMigrationVersion).to.eql('8.8.0');
        });
    });
  });
}
