/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { configArray } from '../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('default index pattern api', () => {
    configArray.forEach((config) => {
      describe(config.name, () => {
        const newId = () => `default-id-${Date.now()}-${Math.random()}`;
        it('can set default index pattern', async () => {
          const defaultId = newId();
          const defaultPath = `${config.basePath}/default`;
          const serviceKeyId = `${config.serviceKey}_id`;
          const response1 = await supertest.post(defaultPath).send({
            [serviceKeyId]: defaultId,
            force: true,
          });
          expect(response1.status).to.be(200);
          expect(response1.body.acknowledged).to.be(true);

          const response2 = await supertest.get(defaultPath);
          expect(response2.status).to.be(200);
          expect(response2.body[serviceKeyId]).to.be(defaultId);

          const response3 = await supertest.post(defaultPath).send({
            [serviceKeyId]: newId(),
            // no force this time, so this new default shouldn't be set
          });

          expect(response3.status).to.be(200);
          const response4 = await supertest.get(defaultPath);
          expect(response4.body[serviceKeyId]).to.be(defaultId); // original default id is used

          const response5 = await supertest.post(defaultPath).send({
            [serviceKeyId]: null,
            force: true,
          });
          expect(response5.status).to.be(200);

          const response6 = await supertest.get(defaultPath);
          expect(response6.body[serviceKeyId]).to.be(null);
        });
      });
    });
  });
}
