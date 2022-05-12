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

  describe('errors', () => {
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('returns 404 error on non-existing index_pattern', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertest.post(`${config.path}/${id}/fields`).send({
            fields: {
              foo: {},
            },
          });

          expect(response.status).to.be(404);
        });

        it('returns error when "fields" payload attribute is invalid', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
            },
          });
          const response2 = await supertest
            .post(`${config.path}/${response1.body[config.serviceKey].id}/fields`)
            .send({
              fields: 123,
            });

          expect(response2.status).to.be(400);
          expect(response2.body.statusCode).to.be(400);
          expect(response2.body.message).to.be(
            '[request body.fields]: expected value of type [object] but got [number]'
          );
        });

        it('returns error if not changes are specified', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title,
            },
          });

          const response2 = await supertest
            .post(`${config.path}/${response1.body[config.serviceKey].id}/fields`)
            .send({
              fields: {
                foo: {},
                bar: {},
                baz: {},
              },
            });

          expect(response2.status).to.be(400);
          expect(response2.body.statusCode).to.be(400);
          expect(response2.body.message).to.be('Change set is empty.');
        });
      });
    });
  });
}
