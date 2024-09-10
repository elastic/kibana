/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
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
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });
    describe('post', () => {
      it('should return 200 when correctly formatted searches are provided', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
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
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      it('should return 200 if terminated early', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
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
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      it('should return 404 when if no strategy is provided', async () => {
        const resp = await supertest
          .post(`/internal/search`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
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
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
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
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      it('should return 400 with illegal ES argument', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
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
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
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
        const resp = await supertest
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .send(painlessErrReq)
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'search_phase_execution_exception', true);
      });
    });

    describe('delete', () => {
      it('should return 404 when no search id provided', async () => {
        const resp = await supertest
          .delete(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .send()
          .expect(404);
        verifyErrorResponse(resp.body, 404);
      });

      it('should return 400 when trying a delete on a non supporting strategy', async () => {
        const resp = await supertest
          .delete(`/internal/search/es/123`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .send()
          .expect(400);
        verifyErrorResponse(resp.body, 400);
        expect(resp.body.message).to.contain("Search strategy es doesn't support cancellations");
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });
    });
  });
}
