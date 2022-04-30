/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import { inflateResponse } from '../../../../src/plugins/bfetch/public/streaming';
import { FtrProviderContext } from '../../ftr_provider_context';
import { painlessErrReq } from './painless_err_req';
import { verifyErrorResponse } from './verify_error';

function parseBfetchResponse(resp: request.Response, compressed: boolean = false) {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => {
      return JSON.parse(compressed ? inflateResponse<any>(item) : item);
    });
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('bsearch', () => {
    describe('post', () => {
      it('should return 200 a single response', async () => {
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                params: {
                  index: '.kibana',
                  body: {
                    query: {
                      match_all: {},
                    },
                  },
                },
              },
              options: {
                strategy: 'es',
              },
            },
          ],
        });

        const jsonBody = parseBfetchResponse(resp);

        expect(resp.status).to.be(200);
        expect(jsonBody[0].id).to.be(0);
        expect(jsonBody[0].result.isPartial).to.be(false);
        expect(jsonBody[0].result.isRunning).to.be(false);
        expect(jsonBody[0].result).to.have.property('rawResponse');
      });

      it('should return 200 a single response from compressed', async () => {
        const resp = await supertest.post(`/internal/bsearch?compress=true`).send({
          batch: [
            {
              request: {
                params: {
                  index: '.kibana',
                  body: {
                    query: {
                      match_all: {},
                    },
                  },
                },
              },
              options: {
                strategy: 'es',
              },
            },
          ],
        });

        const jsonBody = parseBfetchResponse(resp, true);

        expect(resp.status).to.be(200);
        expect(jsonBody[0].id).to.be(0);
        expect(jsonBody[0].result.isPartial).to.be(false);
        expect(jsonBody[0].result.isRunning).to.be(false);
        expect(jsonBody[0].result).to.have.property('rawResponse');
      });

      it('should return a batch of successful responses', async () => {
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                params: {
                  index: '.kibana',
                  body: {
                    query: {
                      match_all: {},
                    },
                  },
                },
              },
            },
            {
              request: {
                params: {
                  index: '.kibana',
                  body: {
                    query: {
                      match_all: {},
                    },
                  },
                },
              },
            },
          ],
        });

        expect(resp.status).to.be(200);
        const parsedResponse = parseBfetchResponse(resp);
        expect(parsedResponse).to.have.length(2);
        parsedResponse.forEach((responseJson) => {
          expect(responseJson.result).to.have.property('isPartial');
          expect(responseJson.result).to.have.property('isRunning');
          expect(responseJson.result).to.have.property('rawResponse');
        });
      });

      it('should return error for not found strategy', async () => {
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                params: {
                  index: '.kibana',
                  body: {
                    query: {
                      match_all: {},
                    },
                  },
                },
              },
              options: {
                strategy: 'wtf',
              },
            },
          ],
        });

        expect(resp.status).to.be(200);
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 404, 'Search strategy wtf not found');
        });
      });

      it('should return 400 when index type is provided in "es" strategy', async () => {
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                index: '.kibana',
                indexType: 'baad',
                params: {
                  body: {
                    query: {
                      match_all: {},
                    },
                  },
                },
              },
              options: {
                strategy: 'es',
              },
            },
          ],
        });

        expect(resp.status).to.be(200);
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 400, 'Unsupported index pattern type baad');
        });
      });

      describe('painless', () => {
        before(async () => {
          await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        });

        after(async () => {
          await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
        });
        it('should return 400 "search_phase_execution_exception" for Painless error in "es" strategy', async () => {
          const resp = await supertest.post(`/internal/bsearch`).send({
            batch: [
              {
                request: painlessErrReq,
                options: {
                  strategy: 'es',
                },
              },
            ],
          });

          expect(resp.status).to.be(200);
          parseBfetchResponse(resp).forEach((responseJson, i) => {
            expect(responseJson.id).to.be(i);
            verifyErrorResponse(responseJson.error, 400, 'search_phase_execution_exception', true);
          });
        });
      });
    });
  });
}
