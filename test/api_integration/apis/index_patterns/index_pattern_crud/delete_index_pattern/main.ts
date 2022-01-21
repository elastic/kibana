/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('deletes an index_pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
            },
          });
          const response2 = await supertest.get(
            `${config.path}/${response1.body[config.serviceKey].id}`
          );

          expect(response2.status).to.be(200);

          const response3 = await supertest.delete(
            `${config.path}/${response1.body[config.serviceKey].id}`
          );

          expect(response3.status).to.be(200);

          const response4 = await supertest.get(
            `${config.path}/${response1.body[config.serviceKey].id}`
          );

          expect(response4.status).to.be(404);
        });

        it('returns nothing', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
            },
          });
          await supertest.get(`${config.path}/${response1.body[config.serviceKey].id}`);
          const response2 = await supertest.delete(
            `${config.path}/${response1.body[config.serviceKey].id}`
          );

          expect(!!response2.body).to.be(false);
        });
      });
    });
  });
}
