/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('server plugins', function describeIndexTests() {
    it('extend request handler context', async () => {
      await supertest.get('/core_plugin_b').expect(200).expect('Pong via plugin A: true');
    });

    it('extend request handler context with validation', async () => {
      await supertest
        .post('/core_plugin_b')
        .set('kbn-xsrf', 'anything')
        .query({ id: 'TEST' })
        .send({ bar: 'hi!', baz: 'hi!' })
        .expect(200)
        .expect('ID: TEST - HI!');
    });

    it('extend request handler context with validation (400)', async () => {
      await supertest
        .post('/core_plugin_b')
        .set('kbn-xsrf', 'anything')
        .query({ id: 'TEST' })
        .send({ bar: 'hi!', baz: 1234 })
        .expect(400)
        .expect({
          error: 'Bad Request',
          message: '[request body]: bar: hi! !== baz: 1234 or they are not string',
          statusCode: 400,
        });
    });

    it('sets request.isSystemRequest when kbn-system-request header is set', async () => {
      await supertest
        .post('/core_plugin_b/system_request')
        .set('kbn-xsrf', 'anything')
        .set('kbn-system-request', 'true')
        .send()
        .expect(200)
        .expect('System request? true');
    });
  });
}
