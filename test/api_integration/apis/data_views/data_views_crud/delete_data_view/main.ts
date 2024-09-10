/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('deletes an index_pattern', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertest
            .post(config.path)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({
              [config.serviceKey]: {
                title,
              },
            });

          const response2 = await supertest
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION);

          expect(response2.status).to.be(200);

          const response3 = await supertest
            .delete(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION);

          expect(response3.status).to.be(200);

          const response4 = await supertest
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION);

          expect(response4.status).to.be(404);
        });
      });

      it('returns nothing', async () => {
        const title = `foo-${Date.now()}-${Math.random()}*`;
        const response1 = await supertest

          .post(config.path)
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .send({
            [config.serviceKey]: {
              title,
            },
          });

        await supertest.get(`${config.path}/${response1.body[config.serviceKey].id}`);
        const response2 = await supertest
          .delete(`${config.path}/${response1.body[config.serviceKey].id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION);

        // verify empty response
        expect(Object.keys(response2.body).length).to.be(0);
      });
    });
  });
}
