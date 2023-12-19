/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import { inflateResponse } from '@kbn/bfetch-plugin/public/streaming';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BFETCH_ROUTE_VERSION_LATEST } from '@kbn/bfetch-plugin/common';
import {
  buildFunctionsLookupMap,
  evalFunctionsDefinitions,
  statsAggregationFunctionDefinitions,
} from '@kbn/esql';
import { FtrProviderContext } from '../../ftr_provider_context';

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

  describe('available functions', () => {
    it(`should be in sync with Elasticsearch`, async () => {
      const resp = await supertest
        .post(`/internal/bsearch`)
        .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
        .send({
          batch: [
            {
              request: {
                params: {
                  query: 'show functions | keep name',
                },
              },
              options: {
                strategy: 'esql',
              },
            },
          ],
        });

      const jsonBody = parseBfetchResponse(resp);

      expect(resp.status).to.be(200);
      expect(jsonBody[0].result.requestParams).to.eql({
        method: 'POST',
        path: '/_query',
      });
      // this function takes care of alias as well
      const currentFnLookup = buildFunctionsLookupMap(
        evalFunctionsDefinitions.concat(statsAggregationFunctionDefinitions)
      );
      // console.log(jsonBody);
      const missingFns = [];
      for (const [fn] of jsonBody[0].result.rawResponse.values) {
        if (!currentFnLookup.has(fn)) {
          missingFns.push(fn);
        }
      }
      if (missingFns.length) {
        expect().fail(`ESQL missing function definitions: ${missingFns.join(', ')}`);
      }
    });
  });
}
