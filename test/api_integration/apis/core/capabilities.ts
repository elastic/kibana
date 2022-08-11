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

  describe('/api/core/capabilities', () => {
    it(`returns a 400 when an invalid app id is provided`, async () => {
      const { body } = await supertest
        .post('/api/core/capabilities')
        .send({
          applications: ['dashboard', 'discover', 'bad%app'],
        })
        .expect(400);
      expect(body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: '[request body.applications.2]: Invalid application id',
      });
    });
  });
}
