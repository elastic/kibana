/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewConfig } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    describe('get data views api', () => {
      it('returns list of data views', async () => {
        const response = await supertest.get(dataViewConfig.basePath);
        expect(response.status).to.be(200);
        expect(response.body).to.have.property(dataViewConfig.serviceKey);
        expect(response.body[dataViewConfig.serviceKey]).to.be.an('array');
      });
    });
  });
}
