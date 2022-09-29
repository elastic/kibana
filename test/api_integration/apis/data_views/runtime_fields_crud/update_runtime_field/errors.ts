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
          const response = await supertest.post(`${config.path}/${id}/runtime_field/foo`).send({
            runtimeField: {
              type: 'keyword',
              script: {
                source: "doc['something_new'].value",
              },
            },
          });

          expect(response.status).to.be(404);
        });

        it('returns error when field name is specified', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertest.post(`${config.path}/${id}/runtime_field/foo`).send({
            name: 'foo',
            runtimeField: {
              type: 'keyword',
              script: {
                source: "doc['something_new'].value",
              },
            },
          });

          expect(response.status).to.be(400);
          expect(response.body.statusCode).to.be(400);
          expect(response.body.message).to.be(
            "[request body.name]: a value wasn't expected to be present"
          );
        });
      });
    });
  });
}
