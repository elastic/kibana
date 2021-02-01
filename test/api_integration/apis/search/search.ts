/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { painlessErrReq } from './painless_err_req';
import { verifyErrorResponse } from './verify_error';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('search', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('../../../functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('../../../functional/fixtures/es_archiver/logstash_functional');
    });
    describe('post', () => {
      it('should return 200 when correctly formatted searches are provided', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);

        expect(resp.status).to.be(200);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body).to.have.property('rawResponse');
      });

      it('should return 200 if terminated early', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .send({
            params: {
              terminateAfter: 1,
              index: 'log*',
              size: 1000,
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);

        expect(resp.status).to.be(200);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body.rawResponse.terminated_early).to.be(true);
      });

      it('should return 404 when if no strategy is provided', async () => {
        const resp = await supertest
          .post(`/internal/search`)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404);

        verifyErrorResponse(resp.body, 404);
      });

      it('should return 404 when if unknown strategy is provided', async () => {
        const resp = await supertest
          .post(`/internal/search/banana`)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404);

        verifyErrorResponse(resp.body, 404);
        expect(resp.body.message).to.contain('banana not found');
      });

      it('should return 400 when index type is provided in OSS', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .send({
            indexType: 'baad',
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400);

        expect(resp.body.message).to.contain('Unsupported index pattern');
      });

      it('should return 400 with illegal ES argument', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .send({
            params: {
              timeout: 1, // This should be a time range string!
              index: 'log*',
              size: 1000,
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'illegal_argument_exception', true);
      });

      it('should return 400 with a bad body', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .send({
            params: {
              body: {
                index: 'nope nope',
                bad_query: [],
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'parsing_exception', true);
      });

      it('should return 400 for a painless error', async () => {
        const resp = await supertest.post(`/internal/search/es`).send(painlessErrReq).expect(400);

        verifyErrorResponse(resp.body, 400, 'search_phase_execution_exception', true);
      });
    });

    describe('delete', () => {
      it('should return 404 when no search id provided', async () => {
        const resp = await supertest.delete(`/internal/search/es`).send().expect(404);
        verifyErrorResponse(resp.body, 404);
      });

      it('should return 400 when trying a delete on a non supporting strategy', async () => {
        const resp = await supertest.delete(`/internal/search/es/123`).send().expect(400);
        verifyErrorResponse(resp.body, 400);
        expect(resp.body.message).to.contain("Search strategy es doesn't support cancellations");
      });
    });
  });
}
