/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse, transactionGroupsFetcher } from './fetcher';

describe('transactionGroupsFetcher', () => {
  let res: ESResponse;
  let clientSpy: jest.Mock;
  beforeEach(async () => {
    clientSpy = jest.fn().mockResolvedValue('ES response');

    const setup = {
      start: 1528113600000,
      end: 1528977600000,
      client: {
        search: clientSpy
      } as any,
      config: {
        get: jest.fn<any, string[]>((key: string) => {
          switch (key) {
            case 'apm_oss.transactionIndices':
              return 'myIndex';
            case 'xpack.apm.ui.transactionGroupBucketSize':
              return 100;
          }
        }),
        has: () => true
      },
      uiFiltersES: [{ term: { 'service.environment': 'test' } }]
    };
    const bodyQuery = { my: 'bodyQuery' };
    res = await transactionGroupsFetcher(setup, bodyQuery);
  });

  it('should call client with correct query', () => {
    expect(clientSpy.mock.calls).toMatchSnapshot();
  });

  it('should return correct response', () => {
    expect(res).toBe('ES response');
  });
});
