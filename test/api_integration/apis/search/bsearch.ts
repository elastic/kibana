/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import { FtrProviderContext } from '../../ftr_provider_context';
import { painlessErrReq } from './painless_err_req';
import { verifyErrorResponse } from './verify_error';

function parseBfetchResponse(resp: request.Response): Array<Record<string, any>> {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => JSON.parse(item));
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

        const jsonBody = JSON.parse(resp.text);

        expect(resp.status).to.be(200);
        expect(jsonBody.id).to.be(0);
        expect(jsonBody.result.isPartial).to.be(false);
        expect(jsonBody.result.isRunning).to.be(false);
        expect(jsonBody.result).to.have.property('rawResponse');
      });

      it('should return a batch of successful resposes', async () => {
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                params: {
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
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          expect(responseJson.result.isPartial).to.be(false);
          expect(responseJson.result.isRunning).to.be(false);
          expect(responseJson.result).to.have.property('rawResponse');
        });
      });

      it('should return error for not found strategy', async () => {
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                params: {
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

      it('should return 400 when index type is provided in OSS', async () => {
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                indexType: 'baad',
                params: {
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
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 400, 'Unsupported index pattern type baad');
        });
      });

      it('should return 400 for Painless error', async () => {
        await esArchiver.loadIfNeeded(
          '../../../functional/fixtures/es_archiver/logstash_functional'
        );
        const resp = await supertest.post(`/internal/bsearch`).send({
          batch: [
            {
              request: painlessErrReq,
            },
          ],
        });

        expect(resp.status).to.be(200);
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 400, 'search_phase_execution_exception', true);
        });

        await esArchiver.unload('../../../functional/fixtures/es_archiver/logstash_functional');
      });
    });
  });
}
