/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PUBLIC_API_PATH } from '@kbn/dashboard-plugin/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('validation', () => {
    describe('dashboards - create', () => {
      it('returns error when attributes object is not provided', async () => {
        const response = await supertest.post(PUBLIC_API_PATH).send({});
        expect(response.status).to.be(400);
        expect(response.body.statusCode).to.be(400);
        expect(response.body.message).to.be(
          '[request body.attributes.title]: expected value of type [string] but got [undefined]'
        );
      });
    });
  });
}
