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
        it('returns error when index_pattern object is not provided', async () => {
          const response = await supertest.post(`${config.path}/foo`);

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            '[request body]: expected a plain object value, but found [null] instead.'
          );
        });

        it('returns error on non-existing index_pattern', async () => {
          const response = await supertest.post(`${config.path}/non-existing-index-pattern`).send({
            [config.serviceKey]: {},
          });

          expect(response.status).to.be(404);
          expect(response.body.statusCode).to.be(404);
          expect(response.body.message).to.be(
            'Saved object [index-pattern/non-existing-index-pattern] not found'
          );
        });

        it('returns error when "refresh_fields" parameter is not a boolean', async () => {
          const response = await supertest.post(`${config.path}/foo`).send({
            refresh_fields: 123,
            [config.serviceKey]: {
              title: 'foo',
            },
          });

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            '[request body.refresh_fields]: expected value of type [boolean] but got [number]'
          );
        });

        it('returns error when update patch is empty', async () => {
          const title1 = `foo-${Date.now()}-${Math.random()}*`;
          const response = await supertest.post(config.path).send({
            [config.serviceKey]: {
              title: title1,
            },
          });
          const id = response.body[config.serviceKey].id;
          const response2 = await supertest.post(`${config.path}/${id}`).send({
            [config.serviceKey]: {},
          });

          expect(response2.status).to.be(400);
          expect(response2.body.statusCode).to.be(400);
          expect(response2.body.message).to.be('Index pattern change set is empty.');
        });
      });
    });
  });
}
