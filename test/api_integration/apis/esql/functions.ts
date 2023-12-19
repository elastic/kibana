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

    it('should have all functions signatures available', async () => {
      const resp = await supertest
        .post(`/internal/bsearch`)
        .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
        .send({
          batch: [
            {
              request: {
                params: {
                  query: 'show functions',
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

      const numberType = ['double', 'unsigned_long', 'long', 'integer'];
      const stringType = ['text', 'keyword'];
      const replaceType = (expectedTypes: string[], types: string | null, newType: string) => {
        if (types == null) {
          return '';
        }
        const removedType = expectedTypes.reduce((memo, nType) => {
          return memo.replace(new RegExp(`${nType}\\|?`), '');
        }, types);
        return expectedTypes.some((n) => types.includes(n))
          ? `${newType}${removedType.length ? '|' : ''}${removedType}`
          : removedType;
      };
      const convertToJsType = (type: string) => {
        if (type === '?') {
          return 'any';
        }
        const tasks: Array<[string, string[]]> = [
          ['number', numberType],
          ['string', stringType],
        ];
        let finalType = type;
        for (const [newType, expectedTypes] of tasks) {
          finalType = replaceType(expectedTypes, finalType, newType);
        }
        return finalType[finalType.length - 1] === '|' ? finalType.slice(0, -1) : finalType;
      };

      const fnIndex = jsonBody[0].result.rawResponse.columns.findIndex(
        ({ name }: { name: string }) => name === 'name'
      );
      const argTypesIndex = jsonBody[0].result.rawResponse.columns.findIndex(
        ({ name }: { name: string }) => name === 'argTypes'
      );
      const returnTypeIndex = jsonBody[0].result.rawResponse.columns.findIndex(
        ({ name }: { name: string }) => name === 'returnType'
      );
      for (const values of jsonBody[0].result.rawResponse.values) {
        const fnName = values[fnIndex];
        const argTypes = values[argTypesIndex];
        const returnType = values[returnTypeIndex];
        const argTypesAsArray = Array.isArray(argTypes) ? argTypes : [argTypes];
        // eslint-disable-next-line no-console
        console.log(
          `${fnName}(${argTypesAsArray
            .map(convertToJsType)
            .map((type, i) => (!type ? type : `arg${i + 1}: ${type}`))
            .join(', ')}): ${convertToJsType(returnType)}`
        );
      }
    });
  });
}
