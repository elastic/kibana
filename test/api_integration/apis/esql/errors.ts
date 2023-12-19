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

  describe('error messages', () => {
    const queryToErrors = [
      ['from missingIndex', 'Unknown index [missingIndex]'],
      [
        'from remote-*:indexes*',
        'ES|QL does not yet support querying remote indices [remote-*:indexes*]',
      ],
      ['row missing_column', 'Unknown column [missing_column]'],
      ['row fn()', 'Unknown function [fn]'],
      ['row a=1, b = average()', 'Unknown function [average]'],
      [
        'row var = 1 in ("a", "b", "c")',
        'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ],
      ['row var = "a" > 0', `Argument of [>] must be [number], found value ["a"] type [string]`],
    ];
    for (const [query, errorMessage] of queryToErrors) {
      it(`Checking error message for: ${query} => ${errorMessage}`, async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    query,
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
        console.log(jsonBody);
      });
    }
  });
}
