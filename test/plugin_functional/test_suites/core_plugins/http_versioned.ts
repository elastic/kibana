/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import '@kbn/core-provider-plugin/types';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  // routes defined in the `core_http` test plugin
  describe('Route version negotiation', () => {
    describe('internal route', () => {
      it('serves requests with the handler corresponding to the specified version', async () => {
        await supertest
          .get('/api/core_http/internal_versioned_route')
          .set('Elastic-Api-Version', '1')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              version: 1,
            });
          });
        await supertest
          .get('/api/core_http/internal_versioned_route')
          .set('Elastic-Api-Version', '2')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              version: 2,
            });
          });
      });

      it('returns the version in response headers', async () => {
        await supertest
          .get('/api/core_http/internal_versioned_route')
          .set('Elastic-Api-Version', '1')
          .expect(200)
          .then((response) => {
            expect(response.headers['elastic-api-version']).to.eql('1');
          });
        await supertest
          .get('/api/core_http/internal_versioned_route')
          .set('Elastic-Api-Version', '2')
          .expect(200)
          .then((response) => {
            expect(response.headers['elastic-api-version']).to.eql('2');
          });
      });

      it('requires the version header to be set', async () => {
        await supertest
          .get('/api/core_http/internal_versioned_route')
          .unset('Elastic-Api-Version')
          .expect(400)
          .then((response) => {
            expect(response.body.message).to.match(/Please specify.+version/);
          });
      });
    });

    describe('public route', () => {
      it('serves requests with the handler corresponding to the specified version', async () => {
        await supertest
          .get('/api/core_http/public_versioned_route')
          .set('Elastic-Api-Version', '2023-10-31')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              version: '2023-10-31',
            });
          });
      });

      it('returns the version in response headers', async () => {
        await supertest
          .get('/api/core_http/public_versioned_route')
          .set('Elastic-Api-Version', '2023-10-31')
          .expect(200)
          .then((response) => {
            expect(response.headers['elastic-api-version']).to.eql('2023-10-31');
          });
      });
    });

    describe('query version', () => {
      it('does not allow passing the version in the query by default', async () => {
        await supertest
          .get('/api/core_http/internal_versioned_route')
          .unset('Elastic-Api-Version')
          .query({ apiVersion: '2' })
          .expect(400);
      });

      it('allows passing the version in the query when enabled via enableQueryVersion', async () => {
        await supertest
          .get('/api/core_http/versioned_route_with_query_version')
          .unset('Elastic-Api-Version')
          .query({ apiVersion: '2' })
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              version: '2',
            });
          });
      });
    });
  });
}
