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

  describe('bulk_delete', () => {
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

    it('should return 200 with individual responses when deleting many docs', async () =>
      await supertest
        .post(`/api/saved_objects/_bulk_delete`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send([
          {
            type: 'visualization',
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          },
          {
            type: 'dashboard',
            id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          },
        ])
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            statuses: [
              {
                success: true,
                type: 'visualization',
                id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
              },
              {
                success: true,
                type: 'dashboard',
                id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
              },
            ],
          });
        }));

    it('should return generic 404 when deleting an unknown doc', async () =>
      await supertest
        .post(`/api/saved_objects/_bulk_delete`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send([{ type: 'dashboard', id: 'not-a-real-id' }])
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            statuses: [
              {
                error: {
                  error: 'Not Found',
                  message: 'Saved object [dashboard/not-a-real-id] not found',
                  statusCode: 404,
                },
                id: 'not-a-real-id',
                type: 'dashboard',
                success: false,
              },
            ],
          });
        }));

    it('should return the result of deleting valid and invalid objects in the same request', async () =>
      await supertest
        .post(`/api/saved_objects/_bulk_delete`)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send([
          { type: 'visualization', id: 'not-a-real-vis-id' },
          {
            type: 'index-pattern',
            id: '91200a00-9efd-11e7-acb3-3dab96693fab',
          },
        ])
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            statuses: [
              {
                error: {
                  error: 'Not Found',
                  message: 'Saved object [visualization/not-a-real-vis-id] not found',
                  statusCode: 404,
                },
                id: 'not-a-real-vis-id',
                type: 'visualization',
                success: false,
              },
              {
                success: true,
                type: 'index-pattern',
                id: '91200a00-9efd-11e7-acb3-3dab96693fab',
              },
            ],
          });
        }));
  });
}
