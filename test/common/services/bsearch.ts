/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import type SuperTest from 'supertest';
import { IEsSearchResponse } from 'src/plugins/data/common';
import { FtrProviderContext } from '../ftr_provider_context';
import { RetryService } from './retry/retry';

/**
 * Function copied from here:
 * test/api_integration/apis/search/bsearch.ts without the compress
 *
 * Splits the JSON lines from bsearch
 */
const parseBfetchResponse = (resp: request.Response): Array<Record<string, any>> => {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => JSON.parse(item));
};

/**
 * Function copied from here:
 * x-pack/test/rule_registry/common/lib/authentication/spaces.ts
 * @param spaceId The space id we want to utilize
 */
const getSpaceUrlPrefix = (spaceId?: string): string => {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : ``;
};

/**
 * Options for the send method
 */
interface SendOptions {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  options: object;
  strategy: string;
  space?: string;
}

/**
 * Bsearch factory which will return a new bsearch capable service that can reduce flake
 * on the CI systems when they are under pressure and bsearch returns an async search
 * response or a sync response.
 *
 * @example
 * const supertest = getService('supertest');
 * const bsearch = getService('bsearch');
 * const response = await bsearch.send<MyType>({
 *   supertest,
 *   options: {
 *     defaultIndex: ['large_volume_dns_data'],
 *   }
 *    strategy: 'securitySolutionSearchStrategy',
 *   });
 * expect(response).eql({ ... your value ... });
 */
export const BSearchFactory = (retry: RetryService) => ({
  /** Send method to send in your supertest, url, options, and strategy name */
  send: async <T extends IEsSearchResponse>({
    supertest,
    options,
    strategy,
    space,
  }: SendOptions): Promise<T> => {
    const spaceUrl = getSpaceUrlPrefix(space);
    const { body } = await retry.try(async () => {
      return supertest
        .post(`${spaceUrl}/internal/search/${strategy}`)
        .set('kbn-xsrf', 'true')
        .send(options)
        .expect(200);
    });

    if (body.isRunning) {
      const result = await retry.try(async () => {
        const resp = await supertest
          .post(`${spaceUrl}/internal/bsearch`)
          .set('kbn-xsrf', 'true')
          .send({
            batch: [
              {
                request: {
                  id: body.id,
                  ...options,
                },
                options: {
                  strategy,
                },
              },
            ],
          })
          .expect(200);
        const [parsedResponse] = parseBfetchResponse(resp);
        expect(parsedResponse.result.isRunning).equal(false);
        return parsedResponse.result;
      });
      return result;
    } else {
      return body;
    }
  },
});

/**
 * Bsearch provider which will return a new bsearch capable service that can reduce flake
 * on the CI systems when they are under pressure and bsearch returns an async search response
 * or a sync response.
 */
export function BSearchProvider({
  getService,
}: FtrProviderContext): ReturnType<typeof BSearchFactory> {
  const retry = getService('retry');
  return BSearchFactory(retry);
}
